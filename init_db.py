"""
Initialize PostgreSQL for the Dutch / European legal AI backend.

This script:
1. Creates the `documents` table via SQLAlchemy.
2. Applies a minimal milestone 1 schema upgrade when the table already exists.
3. Creates helpful lookup and full-text indexes.

Environment variables:
- DATABASE_URL: PostgreSQL SQLAlchemy URL.

Example:
    export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/venice"
    python init_db.py
"""

from __future__ import annotations

from sqlalchemy import text

from backend_common import Base, get_engine, get_logger


LOGGER = get_logger("init_db")


DOCUMENT_COLUMN_UPGRADES = [
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_type TEXT",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_system TEXT",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_id TEXT",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS domain TEXT",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS ecli TEXT",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS title TEXT",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS court TEXT",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS decision_date DATE",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS subject TEXT",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS raw_xml TEXT",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS parser_version TEXT",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
]

INGESTION_JOB_COLUMN_UPGRADES = [
    "ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS job_type TEXT",
    "ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS source_system TEXT",
    "ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS domain TEXT",
    "ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS status TEXT",
    "ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ",
    "ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 0",
    "ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0",
    "ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0",
    "ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS notes TEXT",
    "ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE ingestion_jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
]

INGESTION_JOB_ITEM_COLUMN_UPGRADES = [
    "ALTER TABLE ingestion_job_items ADD COLUMN IF NOT EXISTS source_type TEXT",
    "ALTER TABLE ingestion_job_items ADD COLUMN IF NOT EXISTS source_system TEXT",
    "ALTER TABLE ingestion_job_items ADD COLUMN IF NOT EXISTS source_identifier TEXT",
    "ALTER TABLE ingestion_job_items ADD COLUMN IF NOT EXISTS domain TEXT",
    "ALTER TABLE ingestion_job_items ADD COLUMN IF NOT EXISTS status TEXT",
    "ALTER TABLE ingestion_job_items ADD COLUMN IF NOT EXISTS error_message TEXT",
    "ALTER TABLE ingestion_job_items ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ",
    "ALTER TABLE ingestion_job_items ADD COLUMN IF NOT EXISTS inserted_count INTEGER",
    "ALTER TABLE ingestion_job_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE ingestion_job_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
]

SOURCE_REGISTRY_COLUMN_UPGRADES = [
    "ALTER TABLE source_registry ADD COLUMN IF NOT EXISTS source_system TEXT",
    "ALTER TABLE source_registry ADD COLUMN IF NOT EXISTS source_type TEXT",
    "ALTER TABLE source_registry ADD COLUMN IF NOT EXISTS identifier TEXT",
    "ALTER TABLE source_registry ADD COLUMN IF NOT EXISTS source_url TEXT",
    "ALTER TABLE source_registry ADD COLUMN IF NOT EXISTS domain TEXT",
    "ALTER TABLE source_registry ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
    "ALTER TABLE source_registry ADD COLUMN IF NOT EXISTS notes TEXT",
    "ALTER TABLE source_registry ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE source_registry ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
]


def upgrade_documents_schema(connection) -> None:
    """Apply safe additive upgrades for existing milestone-0 schemas."""
    for statement in DOCUMENT_COLUMN_UPGRADES:
        connection.execute(text(statement))

    connection.execute(
        text(
            """
            UPDATE documents
            SET created_at = COALESCE(created_at, NOW()),
                updated_at = COALESCE(updated_at, NOW())
            WHERE created_at IS NULL OR updated_at IS NULL
            """
        )
    )


def _table_exists(connection, table_name: str) -> bool:
    """Return whether a table already exists in the current schema."""
    return bool(
        connection.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = current_schema()
                  AND table_name = :table_name
                """
            ),
            {"table_name": table_name},
        ).scalar()
    )


def _upgrade_table(connection, table_name: str, statements: list[str]) -> None:
    """Apply additive upgrades when a table already exists."""
    if not _table_exists(connection, table_name):
        return
    for statement in statements:
        connection.execute(text(statement))
    connection.execute(
        text(
            f"""
            UPDATE {table_name}
            SET created_at = COALESCE(created_at, NOW()),
                updated_at = COALESCE(updated_at, NOW())
            WHERE created_at IS NULL OR updated_at IS NULL
            """
        )
    )


def init_database() -> None:
    """Create the database table, safe schema upgrades, and indexes."""
    engine = get_engine()

    with engine.begin() as connection:
        LOGGER.info("Creating database tables.")
        Base.metadata.create_all(bind=connection)
        upgrade_documents_schema(connection)
        _upgrade_table(connection, "ingestion_jobs", INGESTION_JOB_COLUMN_UPGRADES)
        _upgrade_table(connection, "ingestion_job_items", INGESTION_JOB_ITEM_COLUMN_UPGRADES)
        _upgrade_table(connection, "source_registry", SOURCE_REGISTRY_COLUMN_UPGRADES)

        LOGGER.info("Creating indexes for milestone 2 persistence, ingestion, and search.")
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_documents_source_id ON documents (source_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_documents_source_type ON documents (source_type)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_documents_domain ON documents (domain)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_documents_ecli ON documents (ecli)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_documents_bwbr_id ON documents (bwbr_id)"))
        connection.execute(text("DROP INDEX IF EXISTS idx_documents_source_chunk_unique"))
        connection.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_source_chunk_unique
                ON documents (
                    coalesce(source_type, ''),
                    coalesce(source_system, ''),
                    coalesce(source_id, ''),
                    coalesce(domain, ''),
                    coalesce(article, ''),
                    coalesce(section, '')
                )
                WHERE source_id IS NOT NULL
                """
            )
        )
        connection.execute(
            text(
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
        )
        connection.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_recent
                ON ingestion_jobs (created_at DESC)
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS idx_ingestion_job_items_job_source_unique
                ON ingestion_job_items (job_id, source_system, source_type, source_identifier, coalesce(domain, ''))
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_ingestion_job_items_job_status
                ON ingestion_job_items (job_id, status)
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS idx_source_registry_unique
                ON source_registry (source_system, source_type, identifier, coalesce(domain, ''))
                """
            )
        )

    LOGGER.info("Database initialization completed successfully.")


if __name__ == "__main__":
    init_database()
