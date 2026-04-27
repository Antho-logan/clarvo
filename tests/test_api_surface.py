from __future__ import annotations

import importlib
import os
from pathlib import Path

import pytest
import jwt
from alembic import command
from alembic.config import Config
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


def _test_database_url() -> str:
    database_url = os.getenv("TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("TEST_DATABASE_URL is required for API integration tests.")
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


def test_workflows_endpoint_lists_registered_workflows(monkeypatch: pytest.MonkeyPatch) -> None:
    database_url = _test_database_url()
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("AUTH_SECRET", AUTH_SECRET)
    _reset_and_migrate(database_url)

    import api.main

    api_main = importlib.reload(api.main)
    response = TestClient(api_main.app).get("/workflows", headers=_auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert body["count"] >= 2
    assert {workflow["id"] for workflow in body["workflows"]} >= {
        "huurcontract_review_workflow",
        "bezwaarvoorbereiding_workflow",
    }
