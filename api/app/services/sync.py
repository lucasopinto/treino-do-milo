"""Sincronização: o mais recente vence (mesma regra de web/src/domain/merge.ts).

* Cada registro tem `updatedAt` (horário da última edição, no relógio do celular que editou)
  e `deviceId`. Para o mesmo registro, vence o `updatedAt` maior; empate, o `deviceId` maior.
* Cada gravação aceita ganha um número `seq` crescente da casa. Os aparelhos pedem
  "tudo depois do seq N", então um celular com relógio errado nunca faz outro perder mudanças.
* Um `updatedAt` mais de 5 minutos no futuro (relógio adiantado) é trazido para "agora",
  para uma edição feita num celular adiantado não vencer todas as outras para sempre.
"""

import json
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy import select, tuple_
from sqlalchemy.orm import Session

from ..models import Household, Record
from ..schemas import SyncRecord
from ..util import now_ms

FUTURE_TOLERANCE_MS = 5 * 60_000
MAX_RECORD_BYTES = 300_000  # a foto do cachorro (JPEG 512 px em data URL) fica bem abaixo disso
PULL_PAGE = 500


def incoming_wins(cur_updated: int, cur_device: str, inc_updated: int, inc_device: str) -> bool:
    """Igual a pickNewer(atual, chegando) no app: True se o registro que chega deve substituir o atual."""
    if cur_updated != inc_updated:
        return inc_updated > cur_updated
    return inc_device > cur_device


def to_sync_record(r: Record) -> SyncRecord:
    return SyncRecord(collection=r.collection, id=r.id, updated_at=r.updated_at, device_id=r.device_id, data=r.data)  # type: ignore[arg-type]


@dataclass
class PushResult:
    accepted: int
    corrections: list[SyncRecord]
    seq: int


def apply_push(session: Session, household_id: str, records: list[SyncRecord], now: int | None = None) -> PushResult:
    now = now_ms() if now is None else now
    # Trava a linha da casa: dois celulares enviando ao mesmo tempo recebem seq em ordem, sem buracos.
    household = session.scalar(select(Household).where(Household.id == household_id).with_for_update())
    if household is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Casa não encontrada.")

    keys = {(r.collection, r.id) for r in records}
    existing: dict[tuple[str, str], Record] = {}
    if keys:
        rows = session.scalars(
            select(Record).where(Record.household_id == household_id, tuple_(Record.collection, Record.id).in_(list(keys)))
        ).all()
        existing = {(r.collection, r.id): r for r in rows}

    accepted = 0
    corrections: dict[tuple[str, str], SyncRecord] = {}
    for rec in records:
        if len(json.dumps(rec.data)) > MAX_RECORD_BYTES:
            raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, f"Registro grande demais: {rec.collection}/{rec.id}.")
        key = (rec.collection, rec.id)
        updated_at = rec.updated_at
        clamped = updated_at > now + FUTURE_TOLERANCE_MS
        if clamped:
            updated_at = now
        data = {**rec.data, "id": rec.id, "updatedAt": updated_at, "deviceId": rec.device_id}

        cur = existing.get(key)
        if cur is not None and not incoming_wins(cur.updated_at, cur.device_id, updated_at, rec.device_id):
            # O servidor já tem uma versão mais nova (ou igual): o celular deve ficar com ela.
            if (cur.updated_at, cur.device_id) != (rec.updated_at, rec.device_id):
                corrections[key] = to_sync_record(cur)
            continue

        household.seq += 1
        if cur is None:
            cur = Record(household_id=household_id, collection=rec.collection, id=rec.id)
            session.add(cur)
            existing[key] = cur
        cur.data = data
        cur.updated_at = updated_at
        cur.device_id = rec.device_id
        cur.seq = household.seq
        accepted += 1
        if clamped:
            corrections[key] = to_sync_record(cur)
        else:
            corrections.pop(key, None)

    session.commit()
    return PushResult(accepted=accepted, corrections=list(corrections.values()), seq=household.seq)


def pull(session: Session, household_id: str, since: int, limit: int = PULL_PAGE) -> tuple[list[SyncRecord], int, bool]:
    rows = session.scalars(
        select(Record).where(Record.household_id == household_id, Record.seq > since).order_by(Record.seq).limit(limit + 1)
    ).all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    if rows:
        seq = rows[-1].seq
    else:
        household = session.get(Household, household_id)
        seq = max(since, household.seq if household else 0)
    return [to_sync_record(r) for r in rows], seq, has_more


def get_settings_record(session: Session, household_id: str) -> dict | None:
    rec = session.get(Record, (household_id, "settings", "settings"))
    return rec.data if rec else None
