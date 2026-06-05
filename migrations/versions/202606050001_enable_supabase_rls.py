"""enable Supabase RLS guardrails

Revision ID: 202606050001
Revises: 202606040001
Create Date: 2026-06-05 01:30:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "202606050001"
down_revision: Union[str, Sequence[str], None] = "202606040001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


APP_TABLES = (
    "alembic_version",
    "documents",
    "ingestion_jobs",
    "ingestion_job_items",
    "source_registry",
    "users",
    "accounts",
    "sessions",
    "verification_token",
    "matter",
    "matter_documents",
    "matter_agent_runs",
    "user_settings",
)


def upgrade() -> None:
    """Enable RLS so browser Supabase clients cannot read/write app tables."""
    op.execute("CREATE SCHEMA IF NOT EXISTS auth")
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_proc
            JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
            WHERE pg_namespace.nspname = 'auth'
              AND pg_proc.proname = 'uid'
              AND pg_proc.pronargs = 0
          ) THEN
            CREATE FUNCTION auth.uid()
            RETURNS uuid
            LANGUAGE sql
            STABLE
            AS 'SELECT NULLIF(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
          END IF;
        END
        $$;
        """
    )

    for table in APP_TABLES:
        op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')

    # User-owned tables. Clarvo currently authenticates with Auth.js, not
    # Supabase Auth, so these policies are restrictive for direct Supabase API
    # access while the server-side SQLAlchemy role continues to own normal app
    # operations.
    op.execute(
        """
        CREATE POLICY user_settings_select_own
        ON user_settings
        FOR SELECT
        USING (user_id = auth.uid()::text)
        """
    )
    op.execute(
        """
        CREATE POLICY user_settings_insert_own
        ON user_settings
        FOR INSERT
        WITH CHECK (user_id = auth.uid()::text)
        """
    )
    op.execute(
        """
        CREATE POLICY user_settings_update_own
        ON user_settings
        FOR UPDATE
        USING (user_id = auth.uid()::text)
        WITH CHECK (user_id = auth.uid()::text)
        """
    )
    op.execute(
        """
        CREATE POLICY matter_select_own
        ON matter
        FOR SELECT
        USING (user_id = auth.uid()::text)
        """
    )
    op.execute(
        """
        CREATE POLICY matter_insert_own
        ON matter
        FOR INSERT
        WITH CHECK (user_id = auth.uid()::text)
        """
    )
    op.execute(
        """
        CREATE POLICY matter_update_own
        ON matter
        FOR UPDATE
        USING (user_id = auth.uid()::text)
        WITH CHECK (user_id = auth.uid()::text)
        """
    )
    op.execute(
        """
        CREATE POLICY matter_delete_own
        ON matter
        FOR DELETE
        USING (user_id = auth.uid()::text)
        """
    )
    op.execute(
        """
        CREATE POLICY matter_documents_select_own
        ON matter_documents
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM matter
                WHERE matter.id = matter_documents.matter_id
                  AND matter.user_id = auth.uid()::text
            )
        )
        """
    )
    op.execute(
        """
        CREATE POLICY matter_documents_insert_own
        ON matter_documents
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM matter
                WHERE matter.id = matter_documents.matter_id
                  AND matter.user_id = auth.uid()::text
            )
        )
        """
    )
    op.execute(
        """
        CREATE POLICY matter_documents_delete_own
        ON matter_documents
        FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM matter
                WHERE matter.id = matter_documents.matter_id
                  AND matter.user_id = auth.uid()::text
            )
        )
        """
    )
    op.execute(
        """
        CREATE POLICY matter_agent_runs_select_own
        ON matter_agent_runs
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM matter
                WHERE matter.id = matter_agent_runs.matter_id
                  AND matter.user_id = auth.uid()::text
            )
        )
        """
    )
    op.execute(
        """
        CREATE POLICY matter_agent_runs_insert_own
        ON matter_agent_runs
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM matter
                WHERE matter.id = matter_agent_runs.matter_id
                  AND matter.user_id = auth.uid()::text
            )
        )
        """
    )
    op.execute(
        """
        CREATE POLICY matter_agent_runs_delete_own
        ON matter_agent_runs
        FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM matter
                WHERE matter.id = matter_agent_runs.matter_id
                  AND matter.user_id = auth.uid()::text
            )
        )
        """
    )


def downgrade() -> None:
    """Remove policies and disable RLS only for this migration's tables."""
    policies = (
        ("user_settings", "user_settings_select_own"),
        ("user_settings", "user_settings_insert_own"),
        ("user_settings", "user_settings_update_own"),
        ("matter", "matter_select_own"),
        ("matter", "matter_insert_own"),
        ("matter", "matter_update_own"),
        ("matter", "matter_delete_own"),
        ("matter_documents", "matter_documents_select_own"),
        ("matter_documents", "matter_documents_insert_own"),
        ("matter_documents", "matter_documents_delete_own"),
        ("matter_agent_runs", "matter_agent_runs_select_own"),
        ("matter_agent_runs", "matter_agent_runs_insert_own"),
        ("matter_agent_runs", "matter_agent_runs_delete_own"),
    )
    for table, policy in policies:
        op.execute(f'DROP POLICY IF EXISTS {policy} ON "{table}"')
    for table in APP_TABLES:
        op.execute(f'ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY')
