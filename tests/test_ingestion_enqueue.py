from __future__ import annotations

import importlib
import os
from pathlib import Path

import pytest
import jwt
from alembic import command
from alembic.config import Config
from celery.exceptions import CeleryError
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text


REPO_ROOT = Path(__file__).resolve().parents[1]
AUTH_SECRET = "test-auth-secret-with-at-least-thirty-two-bytes"


def _auth_headers() -> dict[str, str]:
    token = jwt.encode(
        {"sub": "test-user", "email": "test@example.com", "aud": "veridicta-api"},
        AUTH_SECRET,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


class _FakeAsyncResult:
    id = "celery-task-1"


class _FakeTask:
    def delay(self, *_: object) -> _FakeAsyncResult:
        return _FakeAsyncResult()


class _FailingTask:
    def delay(self, *_: object) -> _FakeAsyncResult:
        raise CeleryError("redis unavailable")


def _test_database_url() -> str:
    database_url = os.getenv("TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("TEST_DATABASE_URL is required for enqueue API integration tests.")
    if "test" not in database_url.rsplit("/", 1)[-1]:
        pytest.fail("TEST_DATABASE_URL must point at a database with 'test' in its name.")
    return database_url


def _reset_and_migrate(database_url: str) -> None:
    engine = create_engine(database_url, future=True)
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
    engine.dispose()

    config = Config(str(REPO_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(REPO_ROOT / "migrations"))
    config.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(config, "head")


def test_curated_law_endpoint_enqueues_job(monkeypatch: pytest.MonkeyPatch) -> None:
    database_url = _test_database_url()
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("AUTH_SECRET", AUTH_SECRET)
    _reset_and_migrate(database_url)

    import api.main

    api_main = importlib.reload(api.main)
    monkeypatch.setattr(api_main, "curated_law_task", _FakeTask())

    response = TestClient(api_main.app).post(
        "/ingest/curated-law",
        json={"domain": "tenancy_law", "limit": 1},
        headers=_auth_headers(),
    )

    assert response.status_code == 202
    body = response.json()
    assert body["job_id"] > 0
    assert body["task_id"] == "celery-task-1"
    assert body["status"] == "queued"


def test_legacy_law_trigger_now_enqueues_job(monkeypatch: pytest.MonkeyPatch) -> None:
    database_url = _test_database_url()
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("AUTH_SECRET", AUTH_SECRET)
    _reset_and_migrate(database_url)

    import api.main

    api_main = importlib.reload(api.main)
    monkeypatch.setattr(api_main, "curated_law_task", _FakeTask())

    response = TestClient(api_main.app).post(
        "/ingest/laws",
        json={"domain": "employment_law", "limit": 1},
        headers=_auth_headers(),
    )

    assert response.status_code == 202
    assert response.json()["status"] == "queued"


def test_enqueue_failure_marks_job_failed(monkeypatch: pytest.MonkeyPatch) -> None:
    database_url = _test_database_url()
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("AUTH_SECRET", AUTH_SECRET)
    _reset_and_migrate(database_url)

    import api.main
    from repositories.ingestion_jobs import list_jobs

    api_main = importlib.reload(api.main)
    monkeypatch.setattr(api_main, "curated_law_task", _FailingTask())

    response = TestClient(api_main.app).post(
        "/ingest/curated-law",
        json={"domain": "tenancy_law", "limit": 1},
        headers=_auth_headers(),
    )

    assert response.status_code == 503
    jobs = list_jobs(limit=1)
    assert len(jobs) == 1
    assert jobs[0].status == "failed"
    assert jobs[0].failure_count == 1
    assert jobs[0].notes == "enqueue failed: redis unavailable"


def test_embedding_backfill_endpoint_enqueues_job(monkeypatch: pytest.MonkeyPatch) -> None:
    database_url = _test_database_url()
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("AUTH_SECRET", AUTH_SECRET)
    _reset_and_migrate(database_url)

    import api.main

    api_main = importlib.reload(api.main)
    monkeypatch.setattr(api_main, "embedding_backfill_task", _FakeTask())

    response = TestClient(api_main.app).post(
        "/embeddings/backfill",
        json={"mode": "missing", "limit": 10, "page_size": 5},
        headers=_auth_headers(),
    )

    assert response.status_code == 202
    body = response.json()
    assert body["job_id"] > 0
    assert body["task_id"] == "celery-task-1"
    assert body["status"] == "queued"
