"""add embedding lifecycle fields

Revision ID: 202604210002
Revises: 202604210001
Create Date: 2026-04-21 12:00:00.000000
"""

from __future__ import annotations

from alembic import op


revision = "202604210002"
down_revision = "202604210001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add lifecycle metadata for pgvector embeddings."""
    op.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding_model TEXT")
    op.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding_dimensions INTEGER")
    op.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding_version TEXT")
    op.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ")
    op.execute(
        """
        ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS embedding_status TEXT NOT NULL DEFAULT 'pending'
        """
    )
    op.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding_error TEXT")
    op.execute(
        """
        ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS embedding_attempts INTEGER NOT NULL DEFAULT 0
        """
    )
    op.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding_source_hash TEXT")
    op.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_embedding_job_id INTEGER")

    op.execute(
        """
        UPDATE documents
        SET
            embedding_status = 'completed',
            embedding_model = COALESCE(embedding_model, 'text-embedding-3-small'),
            embedding_dimensions = COALESCE(embedding_dimensions, 1536),
            embedding_version = COALESCE(embedding_version, 'v1'),
            embedded_at = COALESCE(embedded_at, updated_at)
        WHERE embedding IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE documents
        SET embedding_status = 'pending'
        WHERE embedding IS NULL
          AND embedding_status NOT IN ('failed', 'skipped')
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_documents_embedding_lifecycle
        ON documents (embedding_status, embedding_model, embedding_version, embedding_dimensions)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_documents_embedding_coverage
        ON documents (source_type, source_system, domain, embedding_status)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_documents_embedding_job
        ON documents (last_embedding_job_id)
        """
    )


def downgrade() -> None:
    """Preserve lifecycle data on downgrade; destructive cleanup is intentionally explicit."""
    return None
