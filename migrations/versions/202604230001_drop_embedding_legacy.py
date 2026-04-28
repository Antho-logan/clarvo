"""drop vestigial embedding legacy column

Revision ID: 202604230001
Revises: 202604210002
Create Date: 2026-04-23 10:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "202604230001"
down_revision: Union[str, Sequence[str], None] = "202604210002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove the unused text embedding copy kept after pgvector migration."""
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS embedding_legacy")


def downgrade() -> None:
    """Recreate the legacy column as nullable for safe revision rollback."""
    op.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding_legacy TEXT")
