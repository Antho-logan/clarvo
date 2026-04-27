"""phase 3 ingestion, seed, and onboarding fields

Revision ID: 202604210001
Revises: 202604190004
Create Date: 2026-04-21 10:00:00.000000
"""

from __future__ import annotations

from alembic import op


revision = "202604210001"
down_revision = "202604190004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add production-shaped audit and onboarding fields idempotently."""
    op.execute(
        """
        ALTER TABLE ingestion_job_items
        ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0
        """
    )
    op.execute(
        """
        ALTER TABLE source_registry
        ADD COLUMN IF NOT EXISTS editorial_priority INTEGER NOT NULL DEFAULT 100
        """
    )
    op.execute(
        """
        ALTER TABLE user_settings
        ADD COLUMN IF NOT EXISTS primary_domain TEXT
        """
    )
    op.execute(
        """
        ALTER TABLE user_settings
        ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_documents_retrieval_filters
        ON documents (domain, source_type, decision_date, effective_from, effective_to)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_source_registry_priority
        ON source_registry (domain, editorial_priority, source_system, source_type)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_ingestion_job_items_retry
        ON ingestion_job_items (job_id, status, retry_count)
        """
    )


def downgrade() -> None:
    """Preserve phase data on downgrade; destructive cleanup is intentionally explicit."""
    return None
