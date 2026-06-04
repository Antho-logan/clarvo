"""add user language preference

Revision ID: 202606040001
Revises: 202604230001
Create Date: 2026-06-04 20:35:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "202606040001"
down_revision: Union[str, Sequence[str], None] = "202604230001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Persist dashboard language preference; Dutch is the product default."""
    op.execute(
        """
        ALTER TABLE user_settings
        ADD COLUMN IF NOT EXISTS language_preference TEXT NOT NULL DEFAULT 'nl'
        """
    )
    op.execute(
        """
        UPDATE user_settings
        SET language_preference = 'nl'
        WHERE language_preference IS NULL
           OR language_preference NOT IN ('nl', 'en')
        """
    )


def downgrade() -> None:
    """Remove language preference while preserving all other settings."""
    op.execute("ALTER TABLE user_settings DROP COLUMN IF EXISTS language_preference")
