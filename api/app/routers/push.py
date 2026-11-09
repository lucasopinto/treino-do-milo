import hmac
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_session
from ..models import Device, PushSubscription, SentReminder
from ..schemas import PushSubscriptionIn, TickOut, VapidOut
from ..security import current_device
from ..services import reminders, webpush
from ..services.sync import get_settings_record
from ..util import new_id, now_ms

router = APIRouter(tags=["avisos (push)"])


def _require_push() -> None:
    if not get_settings().push_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Os avisos pelo servidor não estão configurados.")


@router.get("/push/vapid-public-key", response_model=VapidOut, summary="Chave pública para o app se inscrever")
def vapid_public_key() -> VapidOut:
    s = get_settings()
    return VapidOut(public_key=s.vapid_public_key if s.push_enabled else None)


@router.post("/push/subscribe", status_code=204, summary="Liga os avisos neste aparelho")
def subscribe(body: PushSubscriptionIn, device: Device = Depends(current_device), session: Session = Depends(get_session)) -> Response:
    _require_push()
    sub = session.scalar(select(PushSubscription).where(PushSubscription.endpoint == body.endpoint))
    if sub is None:
        sub = PushSubscription(id=new_id(), endpoint=body.endpoint, created_at=now_ms())
        session.add(sub)
    # Mesma inscrição pode mudar de dono se o celular saiu e entrou de novo.
    sub.household_id = device.household_id
    sub.device_id = device.id
    sub.p256dh = body.keys.p256dh
    sub.auth = body.keys.auth
    session.commit()
    return Response(status_code=204)


@router.delete("/push/subscribe", status_code=204, summary="Desliga os avisos neste aparelho")
def unsubscribe(device: Device = Depends(current_device), session: Session = Depends(get_session)) -> Response:
    session.execute(delete(PushSubscription).where(PushSubscription.device_id == device.id))
    session.commit()
    return Response(status_code=204)


@router.post("/push/test", summary="Manda um aviso de teste para este aparelho")
def test_push(device: Device = Depends(current_device), session: Session = Depends(get_session)) -> dict:
    _require_push()
    subs = session.scalars(select(PushSubscription).where(PushSubscription.device_id == device.id)).all()
    if not subs:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Os avisos não estão ligados neste aparelho.")
    payload = {"title": "Teste do Treino do Milo", "body": "Os avisos estão funcionando.", "tag": "teste", "url": "./#/casa"}
    sent = 0
    for sub in subs:
        r = webpush.send(sub, payload)
        sent += r.ok
        if r.gone:
            session.delete(sub)
    session.commit()
    return {"sent": sent}


@router.post("/cron/tick", response_model=TickOut, summary="Chamado a cada minuto pelo cron externo")
def tick(x_cron_secret: str = Header(default=""), session: Session = Depends(get_session)) -> TickOut:
    secret = get_settings().cron_secret
    if not secret or not hmac.compare_digest(x_cron_secret, secret):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Segredo do cron inválido.")
    return run_tick(session, datetime.now(UTC))


def run_tick(session: Session, now_utc: datetime) -> TickOut:
    settings = get_settings()
    out = TickOut(households=0, reminders=0, sent=0, removed=0)
    if not settings.push_enabled:
        return out
    household_ids = session.scalars(select(PushSubscription.household_id).distinct()).all()
    for hid in household_ids:
        out.households += 1
        house_settings = get_settings_record(session, hid)
        for due in reminders.reminders_for(house_settings, now_utc, settings.timezone):
            # Marca antes de enviar: se dois ticks rodarem juntos, só um consegue gravar.
            session.add(SentReminder(household_id=hid, day=due.day, outing_id=due.outing_id, sent_at=now_ms()))
            try:
                session.commit()
            except IntegrityError:
                session.rollback()
                continue
            out.reminders += 1
            payload = reminders.message(house_settings or {}, due)
            subs = session.scalars(select(PushSubscription).where(PushSubscription.household_id == hid)).all()
            for sub in subs:
                r = webpush.send(sub, payload)
                out.sent += r.ok
                if r.gone:
                    session.delete(sub)
                    out.removed += 1
            session.commit()
    # Limpeza: marcas com mais de 3 dias não servem mais.
    cutoff = now_ms() - 3 * 86_400_000
    session.execute(delete(SentReminder).where(SentReminder.sent_at < cutoff))
    session.commit()
    return out
