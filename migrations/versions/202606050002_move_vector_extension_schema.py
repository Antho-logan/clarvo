"""move pgvector extension out of public schema

Revision ID: 202606050002
Revises: 202606050001
Create Date: 2026-06-05 14:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "202606050002"
down_revision: Union[str, Sequence[str], None] = "202606050001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Keep pgvector objects organized in Supabase's extension schema."""
    op.execute("CREATE SCHEMA IF NOT EXISTS extensions")
    op.execute("GRANT USAGE ON SCHEMA extensions TO PUBLIC")
    op.execute("ALTER EXTENSION vector SET SCHEMA extensions")
    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
            ALTER ROLE postgres SET search_path TO public, extensions;
          END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    """Move pgvector back to public only if this migration is reverted."""
    op.execute("ALTER EXTENSION vector SET SCHEMA public")
    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
            ALTER ROLE postgres SET search_path TO public;
          END IF;
        END
        $$;
        """
    )
