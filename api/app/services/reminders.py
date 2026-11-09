"""Lembretes de saída de xixi (mesma regra de dueOutings em web/src/domain/schedule.ts).

O cron externo chama /cron/tick a cada minuto. Para cada casa, vemos quais horários de saída
caíram nos últimos 10 minutos e ainda não foram avisados hoje; avisamos uma vez só.
"""

import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

MAX_LATE = timedelta(minutes=10)
_HM = re.compile(r"^([01]?\d|2[0-3]):([0-5]\d)$")


@dataclass(frozen=True)
class Due:
    outing_id: str
    label: str
    time: str
    at: datetime  # no fuso da casa

    @property
    def day(self) -> str:
        return self.at.strftime("%Y-%m-%d")


def parse_hm(value: object) -> tuple[int, int] | None:
    if not isinstance(value, str):
        return None
    m = _HM.match(value.strip())
    return (int(m.group(1)), int(m.group(2))) if m else None


def due_outings(outings: list[dict], now: datetime, max_late: timedelta = MAX_LATE) -> list[Due]:
    """Saídas com horário em (now - max_late, now], considerando ontem e hoje (virada da meia-noite)."""
    result: list[Due] = []
    for base in (now - timedelta(days=1), now):
        for o in outings:
            hm = parse_hm(o.get("time"))
            if hm is None or not o.get("id"):
                continue
            at = base.replace(hour=hm[0], minute=hm[1], second=0, microsecond=0)
            if now - max_late < at <= now:
                result.append(Due(outing_id=str(o["id"]), label=str(o.get("label") or "Saída"), time=o["time"], at=at))
    return result


def reminders_for(settings: dict | None, now_utc: datetime, tz: str) -> list[Due]:
    if not settings or not settings.get("remindersEnabled", True):
        return []
    outings = settings.get("outingTimes")
    if not isinstance(outings, list):
        return []
    now = now_utc.astimezone(ZoneInfo(tz))
    return due_outings([o for o in outings if isinstance(o, dict)], now)


def message(settings: dict, due: Due) -> dict:
    dog = settings.get("dogName") or "cachorro"
    return {
        "title": f"Hora de levar o {dog} lá fora",
        "body": f"{due.label} ({due.time}). Recompense em até 3 segundos se ele fizer lá fora.",
        "tag": f"saida-{due.outing_id}",
        "url": "./#/xixi",
    }
