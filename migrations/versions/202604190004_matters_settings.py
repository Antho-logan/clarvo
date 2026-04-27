"""add matters and settings

Revision ID: 202604190004
Revises: 202604190003
Create Date: 2026-04-19 01:36:00.000000
"""

from __future__ import annotations

from alembic import op


revision = "202604190004"
down_revision = "202604190003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create matter and settings tables idempotently."""
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS matter (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            client TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            opened_at DATE NOT NULL DEFAULT CURRENT_DATE,
            closed_at DATE,
            rechtsgebied TEXT,
            description TEXT,
            tags JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_matter_user_id ON matter (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_matter_status ON matter (status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_matter_rechtsgebied ON matter (rechtsgebied)")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS matter_documents (
            matter_id UUID NOT NULL REFERENCES matter(id) ON DELETE CASCADE,
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (matter_id, document_id)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_matter_documents_document_id ON matter_documents (document_id)")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS matter_agent_runs (
            matter_id UUID NOT NULL REFERENCES matter(id) ON DELETE CASCADE,
            run_id TEXT NOT NULL,
            run_type TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (matter_id, run_id)
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            display_name TEXT,
            firm_name TEXT,
            theme_preference TEXT NOT NULL DEFAULT 'system',
            bwb_enabled BOOLEAN NOT NULL DEFAULT true,
            rechtspraak_enabled BOOLEAN NOT NULL DEFAULT true,
            openai_key_configured BOOLEAN NOT NULL DEFAULT false,
            cohere_key_configured BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )


def downgrade() -> None:
    """Preserve matter/settings data on downgrade; drops require a separate migration plan."""
    return None
