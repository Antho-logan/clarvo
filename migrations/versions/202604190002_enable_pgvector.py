"""enable pgvector

Revision ID: 202604190002
Revises: 202604190001
Create Date: 2026-04-19 00:25:00
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision: str = "202604190002"
down_revision: Union[str, Sequence[str], None] = "202604190001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.alter_column("documents", "embedding", new_column_name="embedding_legacy")
    op.add_column("documents", sa.Column("embedding", Vector(1536), nullable=True))
    op.execute(
        """
        UPDATE documents
        SET embedding = embedding_legacy::vector
        WHERE embedding_legacy IS NOT NULL
          AND embedding_legacy LIKE '[%'
          AND vector_dims(embedding_legacy::vector) = 1536
        """
    )
    op.create_index(
        "idx_documents_embedding_hnsw",
        "documents",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )


def downgrade() -> None:
    op.drop_index("idx_documents_embedding_hnsw", table_name="documents")
    op.drop_column("documents", "embedding")
    op.alter_column("documents", "embedding_legacy", new_column_name="embedding")
