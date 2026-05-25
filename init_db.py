"""Initialize or migrate the Clarvo PostgreSQL schema via Alembic.

`init_db.py` is retained as a compatibility wrapper for existing runbooks. New
schema changes must be added as Alembic revisions under `migrations/`.
"""

from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text

from backend_common import get_database_url, get_engine, get_logger


LOGGER = get_logger("init_db")
REPO_ROOT = Path(__file__).resolve().parent
BASELINE_REVISION = "202604190001"


def _alembic_config() -> Config:
    config = Config(str(REPO_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(REPO_ROOT / "migrations"))
    config.set_main_option("sqlalchemy.url", get_database_url())
    return config


def _bootstrap_existing_database() -> None:
    """Stamp pre-Alembic dev databases at the baseline revision."""
    engine = get_engine()
    with engine.begin() as connection:
        inspector = inspect(connection)
        has_documents = inspector.has_table("documents")
        has_alembic_version = inspector.has_table("alembic_version")
        if has_documents and not has_alembic_version:
            LOGGER.info("Existing schema detected without Alembic; stamping baseline revision.")
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS alembic_version (
                        version_num VARCHAR(32) NOT NULL PRIMARY KEY
                    )
                    """
                )
            )
            connection.execute(text("DELETE FROM alembic_version"))
            connection.execute(
                text("INSERT INTO alembic_version (version_num) VALUES (:revision)"),
                {"revision": BASELINE_REVISION},
            )


def init_database() -> None:
    """Apply all Alembic migrations through the current head revision."""
    _bootstrap_existing_database()
    LOGGER.info("Applying Alembic migrations through head.")
    command.upgrade(_alembic_config(), "head")
    LOGGER.info("Database migration completed successfully.")


if __name__ == "__main__":
    init_database()
