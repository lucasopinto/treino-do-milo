from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class Schema(BaseModel):
    """JSON em camelCase, como o app usa."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---------- Casa e aparelhos ----------


class CreateHousehold(Schema):
    device_name: str = Field(min_length=1, max_length=60, examples=["Celular do Lucas"])
    client_device_id: str = Field(min_length=1, max_length=64)


class JoinHousehold(CreateHousehold):
    code: str = Field(min_length=4, max_length=12, examples=["K7M2QX"])


class InviteOut(Schema):
    code: str
    expires_at: int


class AuthOut(Schema):
    token: str = Field(description="Guarde no aparelho. Vai no cabeçalho Authorization: Bearer <token>.")
    household_id: str
    device_id: str
    invite: InviteOut | None = None


class DeviceOut(Schema):
    id: str
    name: str
    created_at: int
    last_seen_at: int
    is_me: bool
    has_push: bool


class HouseholdOut(Schema):
    household_id: str
    created_at: int
    device_id: str
    devices: list[DeviceOut]


class RenameDevice(Schema):
    name: str = Field(min_length=1, max_length=60)


# ---------- Sincronização ----------

Collection = Literal["sessions", "eliminations", "activities", "checklist", "skillProgress", "settings"]


class SyncRecord(Schema):
    """Um registro do app. Os campos de cada tipo vão junto, em `data`, sem validação de formato."""

    collection: Collection
    id: str = Field(min_length=1, max_length=64)
    updated_at: int = Field(ge=0)
    device_id: str = Field(min_length=1, max_length=64)
    data: dict[str, Any]


class PushIn(Schema):
    records: list[SyncRecord] = Field(max_length=500)


class PushOut(Schema):
    accepted: int
    # Versões do servidor para registros que não foram aceitos como vieram
    # (havia uma versão mais nova, ou o horário estava no futuro). O app grava estas.
    corrections: list[SyncRecord]
    seq: int


class PullOut(Schema):
    records: list[SyncRecord]
    seq: int = Field(description="Peça a próxima página com since=seq.")
    has_more: bool


# ---------- Push ----------


class PushKeys(Schema):
    p256dh: str = Field(min_length=1, max_length=256)
    auth: str = Field(min_length=1, max_length=64)


class PushSubscriptionIn(Schema):
    endpoint: str = Field(min_length=10, max_length=1024)
    keys: PushKeys


class VapidOut(Schema):
    public_key: str | None


class TickOut(Schema):
    households: int
    reminders: int
    sent: int
    removed: int
