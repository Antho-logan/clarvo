from __future__ import annotations

import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


REPO_ROOT = Path(__file__).resolve().parents[1]


def _test_database_url() -> str:
    database_url = os.getenv("TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("TEST_DATABASE_URL is required for migration integration tests.")
    if "test" not in database_url.rsplit("/", 1)[-1]:
        pytest.fail("TEST_DATABASE_URL must point at a database with 'test' in its name.")
    return database_url


def _alembic_config(database_url: str) -> Config:
    config = Config(str(REPO_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(REPO_ROOT / "migrations"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def _reset_public_schema(database_url: str) -> None:
    engine = create_engine(database_url, future=True)
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
    engine.dispose()


def test_alembic_upgrade_head_and_downgrade_one_revision(monkeypatch: pytest.MonkeyPatch) -> None:
    database_url = _test_database_url()
    monkeypatch.setenv("DATABASE_URL", database_url)
    _reset_public_schema(database_url)

    config = _alembic_config(database_url)
    command.upgrade(config, "head")

    engine = create_engine(database_url, future=True)
    inspector = inspect(engine)
    assert "users" in inspector.get_table_names()
    columns = {column["name"]: column for column in inspector.get_columns("documents")}
    assert columns["embedding"]["type"].__class__.__name__.upper() == "VECTOR"
    assert "embedding_legacy" not in columns
    assert columns["embedding_status"]["nullable"] is False
    assert columns["embedding_attempts"]["nullable"] is False
    assert "embedding_model" in columns
    assert "embedding_source_hash" in columns

    command.downgrade(config, "202604190001")
    inspector = inspect(engine)
    downgraded_columns = {column["name"]: column for column in inspector.get_columns("documents")}
    assert "embedding_legacy" not in downgraded_columns
    assert downgraded_columns["embedding"]["type"].__class__.__name__.upper() == "TEXT"

    command.upgrade(config, "head")
    engine.dispose()
