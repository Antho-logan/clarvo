"""Shared pytest fixtures for the Veridicta test suite."""

from __future__ import annotations

import importlib
import os
import uuid
from pathlib import Path
from typing import Iterator

import pytest
import jwt
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker


REPO_ROOT = Path(__file__).resolve().parents[1]
AUTH_SECRET = "test-auth-secret-with-at-least-thirty-two-bytes"


def _require_test_database_url() -> str:
    database_url = os.getenv("TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("TEST_DATABASE_URL is required for integration tests.")
    if "test" not in database_url.rsplit("/", 1)[-1]:
        pytest.fail("TEST_DATABASE_URL must point at a database with 'test' in its name.")
    return database_url


@pytest.fixture(scope="session")
def database_url() -> str:
    """Return the test database URL and ensure schema is migrated once per session."""
    url = _require_test_database_url()
    engine = create_engine(url, future=True)
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
    engine.dispose()

    config = Config(str(REPO_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(REPO_ROOT / "migrations"))
    config.set_main_option("sqlalchemy.url", url)
    command.upgrade(config, "head")
    return url


@pytest.fixture
def db_engine(database_url: str, monkeypatch: pytest.MonkeyPatch) -> Iterator[Engine]:
    """Bind the worker process to the test database for the duration of a test."""
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("TEST_DATABASE_URL", database_url)
    monkeypatch.setenv("AUTH_SECRET", AUTH_SECRET)
    engine = create_engine(database_url, future=True)
    _truncate_tables(engine)
    try:
        yield engine
    finally:
        _truncate_tables(engine)
        engine.dispose()


@pytest.fixture
def db_session(db_engine: Engine) -> Iterator[Session]:
    """Yield a SQLAlchemy session bound to the isolated test database."""
    factory = sessionmaker(bind=db_engine, expire_on_commit=False, class_=Session)
    session = factory()
    try:
        yield session
    finally:
        session.close()


def _truncate_tables(engine: Engine) -> None:
    """Reset mutable tables so tests stay isolated."""
    tables = [
        "matter_agent_runs",
        "matter_documents",
        "matter",
        "ingestion_job_items",
        "ingestion_jobs",
        "source_registry",
        "documents",
        "user_settings",
        "sessions",
        "accounts",
        "verification_token",
        "users",
    ]
    with engine.begin() as connection:
        connection.execute(text(f"TRUNCATE {', '.join(tables)} RESTART IDENTITY CASCADE"))


@pytest.fixture
def auth_secret(monkeypatch: pytest.MonkeyPatch) -> str:
    """Ensure the auth secret is set for token-producing tests."""
    monkeypatch.setenv("AUTH_SECRET", AUTH_SECRET)
    return AUTH_SECRET


@pytest.fixture
def auth_headers(auth_secret: str) -> dict[str, str]:
    """Return an Authorization header signed for an in-test user."""
    token = jwt.encode(
        {"sub": "test-user", "email": "test@example.com", "aud": "veridicta-api"},
        auth_secret,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def api_client(db_engine: Engine, auth_secret: str):
    """Return a FastAPI TestClient bound to the test database."""
    from fastapi.testclient import TestClient

    import api.main as api_main

    reloaded = importlib.reload(api_main)
    return TestClient(reloaded.app)


@pytest.fixture
def ensure_user(db_session: Session):
    """Insert a `users` row so FK-bound tables (matters, settings) work."""
    created_ids: list[str] = []

    def _create(user_id: str = "test-user", email: str = "test@example.com") -> str:
        db_session.execute(
            text(
                "INSERT INTO users (id, email, created_at, updated_at) "
                "VALUES (:id, :email, now(), now()) "
                "ON CONFLICT (id) DO NOTHING"
            ),
            {"id": user_id, "email": email},
        )
        db_session.commit()
        created_ids.append(user_id)
        return user_id

    return _create


@pytest.fixture
def new_user_id() -> str:
    """Return a fresh unique user id for tests that need isolation."""
    return f"user-{uuid.uuid4()}"
