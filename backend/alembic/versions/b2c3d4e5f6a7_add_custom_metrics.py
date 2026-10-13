"""add custom_metrics table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-10 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'custom_metrics',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('short', sa.String(), server_default=''),
        sa.Column('category', sa.String(), server_default='Custom'),
        sa.Column('formula', sa.String(), nullable=False),
        sa.Column('description', sa.String(), server_default=''),
        sa.Column('direction', sa.String(), server_default='neutral'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
    )
    op.create_index('ix_custom_metrics_tenant_id', 'custom_metrics', ['tenant_id'])
    op.create_index('ix_custom_metric_tenant_key', 'custom_metrics', ['tenant_id', 'key'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_custom_metric_tenant_key', table_name='custom_metrics')
    op.drop_index('ix_custom_metrics_tenant_id', table_name='custom_metrics')
    op.drop_table('custom_metrics')
