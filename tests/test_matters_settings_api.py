from __future__ import annotations

import importlib
import os
from pathlib import Path

import jwt
import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text


REPO_ROOT = Path(__file__).resolve().parents[1]
AUTH_SECRET = "test-auth-secret-with-at-least-thirty-two-bytes"
USER_ID = "test-user"


def _test_database_url() -> str:
    database_url = os.getenv("TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("TEST_DATABASE_URL is required for matter/settings integration tests.")
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


def _auth_headers() -> dict[str, str]:
    token = jwt.encode(
        {"sub": USER_ID, "email": "test@example.com", "aud": "veridicta-api"},
        AUTH_SECRET,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


def _seed_user(database_url: str) -> None:
    engine = create_engine(database_url, future=True)
    with engine.begin() as connection:
        connection.execute(
            text('INSERT INTO users (id, name, email, "emailVerified") VALUES (:id, :name, :email, now())'),
            {"id": USER_ID, "name": "Test User", "email": "test@example.com"},
        )
    engine.dispose()


def test_matters_crud_and_settings_persist(monkeypatch: pytest.MonkeyPatch) -> None:
    database_url = _test_database_url()
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("AUTH_SECRET", AUTH_SECRET)
    _reset_and_migrate(database_url)
    _seed_user(database_url)

    import api.main

    api_main = importlib.reload(api.main)
    client = TestClient(api_main.app)

    created = client.post(
        "/matters",
        headers=_auth_headers(),
        json={"title": "Huurgeschil Visser", "client": "Visser BV", "rechtsgebied": "tenancy_law"},
    )
    assert created.status_code == 200
    matter_id = created.json()["matter"]["id"]

    listed = client.get("/matters", headers=_auth_headers())
    assert listed.status_code == 200
    assert listed.json()["count"] == 1

    patched = client.patch(
        f"/matters/{matter_id}",
        headers=_auth_headers(),
        json={"status": "paused"},
    )
    assert patched.status_code == 200
    assert patched.json()["matter"]["status"] == "paused"

    settings = client.patch(
        "/settings",
        headers=_auth_headers(),
        json={"firm_name": "Veridicta Test", "rechtspraak_enabled": False},
    )
    assert settings.status_code == 200
    assert settings.json()["settings"]["firm_name"] == "Veridicta Test"
    assert settings.json()["settings"]["rechtspraak_enabled"] is False
