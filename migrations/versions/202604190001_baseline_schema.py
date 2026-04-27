"""baseline schema

Revision ID: 202604190001
Revises: None
Create Date: 2026-04-19 00:20:00
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "202604190001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("document_type", sa.Text(), nullable=False),
        sa.Column("source_type", sa.Text(), nullable=True),
        sa.Column("source_system", sa.Text(), nullable=True),
        sa.Column("source_id", sa.Text(), nullable=True),
        sa.Column("domain", sa.Text(), nullable=True),
        sa.Column("bwbr_id", sa.Text(), nullable=True),
        sa.Column("ecli", sa.Text(), nullable=True),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("article", sa.Text(), nullable=True),
        sa.Column("section", sa.Text(), nullable=True),
        sa.Column("court", sa.Text(), nullable=True),
        sa.Column("decision_date", sa.Date(), nullable=True),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_to", sa.Date(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("raw_xml", sa.Text(), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("parser_version", sa.Text(), nullable=True),
        sa.Column("embedding", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "ingestion_jobs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("job_type", sa.Text(), nullable=False),
        sa.Column("source_system", sa.Text(), nullable=False),
        sa.Column("domain", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_items", sa.Integer(), nullable=False),
        sa.Column("success_count", sa.Integer(), nullable=False),
        sa.Column("failure_count", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "source_registry",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("source_system", sa.Text(), nullable=False),
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column("identifier", sa.Text(), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("domain", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "ingestion_job_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("ingestion_jobs.id"), nullable=False),
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column("source_system", sa.Text(), nullable=False),
        sa.Column("source_identifier", sa.Text(), nullable=False),
        sa.Column("domain", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("inserted_count", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_index("idx_documents_source_id", "documents", ["source_id"])
    op.create_index("idx_documents_source_type", "documents", ["source_type"])
    op.create_index("idx_documents_source_system", "documents", ["source_system"])
    op.create_index("idx_documents_domain", "documents", ["domain"])
    op.create_index("idx_documents_ecli", "documents", ["ecli"])
    op.create_index("idx_documents_bwbr_id", "documents", ["bwbr_id"])
    op.create_index("idx_documents_article", "documents", ["article"])
    op.create_index(
        "idx_documents_source_chunk_unique",
        "documents",
        [
            sa.text("coalesce(source_type, '')"),
            sa.text("coalesce(source_system, '')"),
            sa.text("coalesce(source_id, '')"),
            sa.text("coalesce(domain, '')"),
            sa.text("coalesce(article, '')"),
            sa.text("coalesce(section, '')"),
        ],
        unique=True,
        postgresql_where=sa.text("source_id IS NOT NULL"),
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_documents_fulltext
        ON documents
        USING GIN (
            to_tsvector(
                'dutch',
                coalesce(title, '') || ' ' ||
                coalesce(article, '') || ' ' ||
                coalesce(section, '') || ' ' ||
                coalesce(text, '')
            )
        )
        """
    )

    op.create_index("idx_ingestion_jobs_recent", "ingestion_jobs", [sa.text("created_at DESC")])
    op.create_index("ix_ingestion_jobs_job_type", "ingestion_jobs", ["job_type"])
    op.create_index("ix_ingestion_jobs_source_system", "ingestion_jobs", ["source_system"])
    op.create_index("ix_ingestion_jobs_domain", "ingestion_jobs", ["domain"])
    op.create_index("ix_ingestion_jobs_status", "ingestion_jobs", ["status"])

    op.create_index(
        "idx_ingestion_job_items_job_source_unique",
        "ingestion_job_items",
        ["job_id", "source_system", "source_type", "source_identifier", sa.text("coalesce(domain, '')")],
        unique=True,
    )
    op.create_index("idx_ingestion_job_items_job_status", "ingestion_job_items", ["job_id", "status"])
    op.create_index("ix_ingestion_job_items_job_id", "ingestion_job_items", ["job_id"])
    op.create_index("ix_ingestion_job_items_source_type", "ingestion_job_items", ["source_type"])
    op.create_index("ix_ingestion_job_items_source_system", "ingestion_job_items", ["source_system"])
    op.create_index("ix_ingestion_job_items_source_identifier", "ingestion_job_items", ["source_identifier"])
    op.create_index("ix_ingestion_job_items_domain", "ingestion_job_items", ["domain"])
    op.create_index("ix_ingestion_job_items_status", "ingestion_job_items", ["status"])

    op.create_index(
        "idx_source_registry_unique",
        "source_registry",
        ["source_system", "source_type", "identifier", sa.text("coalesce(domain, '')")],
        unique=True,
    )
    op.create_index("ix_source_registry_source_system", "source_registry", ["source_system"])
    op.create_index("ix_source_registry_source_type", "source_registry", ["source_type"])
    op.create_index("ix_source_registry_identifier", "source_registry", ["identifier"])
    op.create_index("ix_source_registry_domain", "source_registry", ["domain"])


def downgrade() -> None:
    op.drop_table("ingestion_job_items")
    op.drop_table("source_registry")
    op.drop_table("ingestion_jobs")
    op.drop_table("documents")
