"""Tabelas do banco.

Os registros do app (sessões, xixi, atividades, checklist, níveis, configurações) ficam
todos na tabela `records`, guardados como JSON. O servidor não precisa entender cada campo:
ele só aplica a regra "o mais recente vence" e entrega as mudanças aos outros aparelhos.
A exceção são as configurações, que o servidor lê para mandar os lembretes de saída.
"""

from typing import Any

from sqlalchemy import JSON, BigInteger, ForeignKey, Index, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Household(Base):
    """Uma "casa": o grupo de aparelhos que compartilham os dados do mesmo cachorro."""

    __tablename__ = "households"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created_at: Mapped[int] = mapped_column(BigInteger)
    # Contador que cresce a cada registro gravado. Os aparelhos pedem "o que mudou depois do N".
    seq: Mapped[int] = mapped_column(BigInteger, default=0)

    devices: Mapped[list["Device"]] = relationship(back_populates="household", cascade="all, delete-orphan")


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    household_id: Mapped[str] = mapped_column(ForeignKey("households.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(60))
    # deviceId que o app gera e grava em cada registro (milo.deviceId).
    client_device_id: Mapped[str] = mapped_column(String(64))
    # Guardamos só o hash do token: se o banco vazar, os tokens não servem.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[int] = mapped_column(BigInteger)
    last_seen_at: Mapped[int] = mapped_column(BigInteger)

    household: Mapped[Household] = relationship(back_populates="devices")


class Invite(Base):
    __tablename__ = "invites"

    code: Mapped[str] = mapped_column(String(12), primary_key=True)
    household_id: Mapped[str] = mapped_column(ForeignKey("households.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[int] = mapped_column(BigInteger)
    expires_at: Mapped[int] = mapped_column(BigInteger)
    used_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class Record(Base):
    __tablename__ = "records"

    household_id: Mapped[str] = mapped_column(ForeignKey("households.id", ondelete="CASCADE"), primary_key=True)
    # Nome da tabela no app: sessions, eliminations, activities, checklist, skillProgress, settings.
    collection: Mapped[str] = mapped_column(String(32), primary_key=True)
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    data: Mapped[dict[str, Any]] = mapped_column(JSON)
    updated_at: Mapped[int] = mapped_column(BigInteger)
    device_id: Mapped[str] = mapped_column(String(64))
    seq: Mapped[int] = mapped_column(BigInteger)

    __table_args__ = (Index("ix_records_household_seq", "household_id", "seq"),)


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    household_id: Mapped[str] = mapped_column(ForeignKey("households.id", ondelete="CASCADE"), index=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id", ondelete="CASCADE"), index=True)
    endpoint: Mapped[str] = mapped_column(String(1024), unique=True)
    p256dh: Mapped[str] = mapped_column(String(256))
    auth: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[int] = mapped_column(BigInteger)


class SentReminder(Base):
    """Marca cada lembrete enviado, para nunca mandar o mesmo duas vezes."""

    __tablename__ = "sent_reminders"

    household_id: Mapped[str] = mapped_column(ForeignKey("households.id", ondelete="CASCADE"), primary_key=True)
    day: Mapped[str] = mapped_column(String(10), primary_key=True)  # AAAA-MM-DD no fuso da casa
    outing_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    sent_at: Mapped[int] = mapped_column(BigInteger)
