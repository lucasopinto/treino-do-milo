from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_session
from ..models import Device, Household, Invite, PushSubscription
from ..schemas import AuthOut, CreateHousehold, DeviceOut, DeviceScheduleIn, HouseholdOut, InviteOut, JoinHousehold, RenameDevice
from ..security import client_ip, current_device, hash_token, join_limiter, new_invite_code, new_token, normalize_code
from ..services.schedule_cache import cache
from ..util import new_id, now_ms

router = APIRouter(tags=["casa"])

MAX_DEVICES = 8


def _new_device(session: Session, household: Household, body: CreateHousehold) -> tuple[Device, str]:
    token = new_token()
    now = now_ms()
    device = Device(
        id=new_id(),
        household_id=household.id,
        name=body.device_name.strip(),
        client_device_id=body.client_device_id,
        token_hash=hash_token(token),
        created_at=now,
        last_seen_at=now,
    )
    session.add(device)
    return device, token


def _create_invite(session: Session, household_id: str) -> Invite:
    now = now_ms()
    ttl = get_settings().invite_ttl_hours * 3600_000
    # Apaga convites vencidos ou usados desta casa, para a tabela não crescer à toa.
    session.execute(
        delete(Invite).where(Invite.household_id == household_id, (Invite.expires_at < now) | (Invite.used_at.is_not(None)))
    )
    for _ in range(10):
        code = new_invite_code()
        if session.get(Invite, code) is None:
            invite = Invite(code=code, household_id=household_id, created_at=now, expires_at=now + ttl)
            session.add(invite)
            return invite
    raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Não foi possível gerar o código. Tente de novo.")


@router.post("/households", response_model=AuthOut, status_code=201, summary="Cria uma casa nova (primeiro celular)")
def create_household(body: CreateHousehold, session: Session = Depends(get_session)) -> AuthOut:
    household = Household(id=new_id(), created_at=now_ms(), seq=0)
    session.add(household)
    session.flush()
    device, token = _new_device(session, household, body)
    invite = _create_invite(session, household.id)
    session.commit()
    return AuthOut(
        token=token,
        household_id=household.id,
        device_id=device.id,
        invite=InviteOut(code=invite.code, expires_at=invite.expires_at),
    )


@router.post("/households/join", response_model=AuthOut, summary="Entra numa casa com o código de convite")
def join_household(body: JoinHousehold, request: Request, session: Session = Depends(get_session)) -> AuthOut:
    join_limiter.check(client_ip(request))
    code = normalize_code(body.code)
    invite = session.get(Invite, code)
    now = now_ms()
    if invite is None or invite.used_at is not None or invite.expires_at < now:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Código inválido ou vencido. Peça um código novo no outro celular.")
    household = session.get(Household, invite.household_id)
    assert household is not None
    count = session.scalar(select(func.count()).select_from(Device).where(Device.household_id == household.id)) or 0
    if count >= MAX_DEVICES:
        raise HTTPException(status.HTTP_409_CONFLICT, f"A casa já tem {MAX_DEVICES} aparelhos. Remova um antes.")
    invite.used_at = now
    device, token = _new_device(session, household, body)
    try:
        session.commit()
    except IntegrityError:  # pragma: no cover - colisão de token, praticamente impossível
        session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Tente de novo.") from None
    return AuthOut(token=token, household_id=household.id, device_id=device.id)


@router.post("/households/invites", response_model=InviteOut, status_code=201, summary="Gera um código de convite novo")
def create_invite(device: Device = Depends(current_device), session: Session = Depends(get_session)) -> InviteOut:
    invite = _create_invite(session, device.household_id)
    session.commit()
    return InviteOut(code=invite.code, expires_at=invite.expires_at)


@router.get("/households/me", response_model=HouseholdOut, summary="Dados da casa e lista de aparelhos")
def get_household(device: Device = Depends(current_device), session: Session = Depends(get_session)) -> HouseholdOut:
    household = session.get(Household, device.household_id)
    assert household is not None
    devices = session.scalars(select(Device).where(Device.household_id == household.id).order_by(Device.created_at)).all()
    with_push = set(
        session.scalars(select(PushSubscription.device_id).where(PushSubscription.household_id == household.id)).all()
    )
    return HouseholdOut(
        household_id=household.id,
        created_at=household.created_at,
        device_id=device.id,
        devices=[
            DeviceOut(
                id=d.id,
                name=d.name,
                created_at=d.created_at,
                last_seen_at=d.last_seen_at,
                is_me=d.id == device.id,
                has_push=d.id in with_push,
            )
            for d in devices
        ],
    )


@router.patch("/devices/me", status_code=204, summary="Renomeia este aparelho")
def rename_device(body: RenameDevice, device: Device = Depends(current_device), session: Session = Depends(get_session)) -> Response:
    device.name = body.name.strip()
    session.commit()
    return Response(status_code=204)


@router.put("/devices/me/schedule", status_code=204, summary="Grava a agenda de saídas e o fuso deste aparelho")
def set_schedule(body: DeviceScheduleIn, device: Device = Depends(current_device), session: Session = Depends(get_session)) -> Response:
    """Cada aparelho tem a sua agenda, no seu fuso (ex.: um celular no Brasil e outro em Portugal).
    Os avisos do servidor para este aparelho seguem esta agenda."""
    device.schedule = {
        "outingTimes": [o.model_dump() for o in body.outing_times],
        "remindersEnabled": body.reminders_enabled,
    }
    device.timezone = body.timezone
    session.commit()
    cache.invalidate()
    return Response(status_code=204)


@router.delete("/devices/{device_id}", status_code=204, summary="Remove um aparelho da casa (ou sai da casa)")
def remove_device(device_id: str, device: Device = Depends(current_device), session: Session = Depends(get_session)) -> Response:
    target = session.get(Device, device_id)
    if target is None or target.household_id != device.household_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aparelho não encontrado nesta casa.")
    household_id = target.household_id
    session.delete(target)
    session.flush()
    remaining = session.scalar(select(func.count()).select_from(Device).where(Device.household_id == household_id)) or 0
    if remaining == 0:
        # Último aparelho saiu: os dados da casa são apagados do servidor (continuam nos celulares).
        household = session.get(Household, household_id)
        if household is not None:
            session.delete(household)
    session.commit()
    cache.invalidate()
    return Response(status_code=204)
