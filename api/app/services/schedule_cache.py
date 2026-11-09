"""Agenda de saídas em memória, para o /cron/tick não acordar o banco a cada minuto.

O banco grátis do Neon dorme depois de ~5 min sem uso e só conta horas de computação acordado
(100 h/mês no plano grátis). Um tick por minuto consultando o banco o manteria acordado o mês
inteiro (~186 h). Com este cache, o banco só é consultado quando algo muda (configurações,
inscrições) ou quando há um aviso para mandar (~5 vezes por dia).

O servidor roda num processo só (Render grátis = 1 instância, 1 worker), então o cache é coerente.
"""

from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import PushSubscription
from .sync import get_settings_record


@dataclass
class ScheduleCache:
    loaded: bool = False
    # casa -> configurações (o registro "settings" do app)
    households: dict[str, dict | None] = field(default_factory=dict)
    # (casa, dia, saída) já avisados, para nem consultar o banco de novo
    sent: set[tuple[str, str, str]] = field(default_factory=set)
    loads: int = 0  # quantas vezes leu do banco (para os testes)

    def invalidate(self) -> None:
        self.loaded = False

    def reset(self) -> None:
        self.loaded = False
        self.households.clear()
        self.sent.clear()
        self.loads = 0

    def ensure(self, session: Session) -> None:
        if self.loaded:
            return
        ids = session.scalars(select(PushSubscription.household_id).distinct()).all()
        self.households = {hid: get_settings_record(session, hid) for hid in ids}
        self.loaded = True
        self.loads += 1


cache = ScheduleCache()
