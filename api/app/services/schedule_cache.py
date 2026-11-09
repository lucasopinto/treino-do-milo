"""Agenda de saídas em memória, para o /cron/tick não acordar o banco a cada minuto.

O banco grátis do Neon dorme depois de ~5 min sem uso e só conta horas de computação acordado
(100 h/mês no plano grátis). Um tick por minuto consultando o banco o manteria acordado o mês
inteiro (~186 h). Com este cache, o banco só é consultado quando algo muda (configurações,
inscrições, agenda de um aparelho) ou quando há um aviso para mandar (~5 vezes por dia).

O servidor roda num processo só (Render grátis = 1 instância, 1 worker), então o cache é coerente.
"""

from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Device, PushSubscription
from .sync import get_settings_record


@dataclass(frozen=True)
class Target:
    """Um aparelho com avisos ligados: a quem mandar, com que agenda e em que fuso."""

    device_id: str
    household_id: str
    settings: dict | None  # registro "settings" da casa (nome do cachorro; agenda antiga)
    schedule: dict | None  # agenda própria do aparelho (None = usa a da casa)
    timezone: str | None


@dataclass
class ScheduleCache:
    loaded: bool = False
    # aparelho -> alvo dos avisos
    targets: dict[str, Target] = field(default_factory=dict)
    # (aparelho, dia, saída) já avisados, para nem consultar o banco de novo
    sent: set[tuple[str, str, str]] = field(default_factory=set)
    loads: int = 0  # quantas vezes leu do banco (para os testes)

    def invalidate(self) -> None:
        self.loaded = False

    def reset(self) -> None:
        self.loaded = False
        self.targets.clear()
        self.sent.clear()
        self.loads = 0

    def ensure(self, session: Session) -> None:
        if self.loaded:
            return
        ids = session.scalars(select(PushSubscription.device_id).distinct()).all()
        devices = session.scalars(select(Device).where(Device.id.in_(ids))).all() if ids else []
        house_settings: dict[str, dict | None] = {}
        targets: dict[str, Target] = {}
        for d in devices:
            if d.household_id not in house_settings:
                house_settings[d.household_id] = get_settings_record(session, d.household_id)
            targets[d.id] = Target(d.id, d.household_id, house_settings[d.household_id], d.schedule, d.timezone)
        self.targets = targets
        self.loaded = True
        self.loads += 1


cache = ScheduleCache()
