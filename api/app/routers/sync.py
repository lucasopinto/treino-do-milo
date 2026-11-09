from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..db import get_session
from ..models import Device
from ..schemas import PullOut, PushIn, PushOut
from ..security import current_device
from ..services import sync

router = APIRouter(prefix="/sync", tags=["sincronização"])


@router.post("/push", response_model=PushOut, summary="Envia registros criados ou editados neste aparelho")
def push(body: PushIn, device: Device = Depends(current_device), session: Session = Depends(get_session)) -> PushOut:
    result = sync.apply_push(session, device.household_id, body.records)
    return PushOut(accepted=result.accepted, corrections=result.corrections, seq=result.seq)


@router.get("/pull", response_model=PullOut, summary="Recebe o que mudou na casa depois de `since`")
def pull(
    since: int = Query(0, ge=0, description="Último seq recebido (0 = tudo)"),
    limit: int = Query(sync.PULL_PAGE, ge=1, le=1000),
    device: Device = Depends(current_device),
    session: Session = Depends(get_session),
) -> PullOut:
    records, seq, has_more = sync.pull(session, device.household_id, since, limit)
    return PullOut(records=records, seq=seq, has_more=has_more)
