"""agenda de saídas e fuso por aparelho

Cada pessoa pode morar num lugar (ex.: Brasil e Portugal), então cada aparelho tem a sua
agenda de saídas e o seu fuso, e as marcas de "lembrete já enviado" passam a ser por aparelho.

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-09 19:10:00
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = '0002'
down_revision: str | None = '0001'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('devices', schema=None) as batch_op:
        batch_op.add_column(sa.Column('schedule', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('timezone', sa.String(length=64), nullable=True))

    op.create_table('sent_device_reminders',
    sa.Column('device_id', sa.String(length=36), nullable=False),
    sa.Column('day', sa.String(length=10), nullable=False),
    sa.Column('outing_id', sa.String(length=64), nullable=False),
    sa.Column('sent_at', sa.BigInteger(), nullable=False),
    sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('device_id', 'day', 'outing_id')
    )
    # As marcas antigas eram por casa e só valem por um dia: podem ser descartadas.
    op.drop_table('sent_reminders')


def downgrade() -> None:
    op.create_table('sent_reminders',
    sa.Column('household_id', sa.String(length=36), nullable=False),
    sa.Column('day', sa.String(length=10), nullable=False),
    sa.Column('outing_id', sa.String(length=64), nullable=False),
    sa.Column('sent_at', sa.BigInteger(), nullable=False),
    sa.ForeignKeyConstraint(['household_id'], ['households.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('household_id', 'day', 'outing_id')
    )
    op.drop_table('sent_device_reminders')
    with op.batch_alter_table('devices', schema=None) as batch_op:
        batch_op.drop_column('timezone')
        batch_op.drop_column('schedule')
