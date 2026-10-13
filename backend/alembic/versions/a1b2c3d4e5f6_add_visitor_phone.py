"""add visitor phone column

Revision ID: a1b2c3d4e5f6
Revises: 7420d3775007
Create Date: 2026-06-04 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '7420d3775007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('visitors') as batch_op:
        batch_op.add_column(sa.Column('phone', sa.String(), nullable=True, server_default=''))
        batch_op.create_index('ix_visitors_phone', ['phone'])
        batch_op.create_index('ix_visitors_email', ['email'])


def downgrade() -> None:
    with op.batch_alter_table('visitors') as batch_op:
        batch_op.drop_index('ix_visitors_email')
        batch_op.drop_index('ix_visitors_phone')
        batch_op.drop_column('phone')
