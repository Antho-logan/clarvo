from __future__ import annotations

import importlib
import os
import uuid
from datetime import date, datetime, timezone
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text


REPO_ROOT = Path(__file__).resolve().parents[1]


class _FakeEmbeddingResponse:
    data = [type("EmbeddingRow", (), {"embedding": [1.0] + [0.0] * 1535})()]


class _FakeEmbeddings:
    def create(self, **_: object) -> _FakeEmbeddingResponse:
        return _FakeEmbeddingResponse()


class _FakeOpenAIClient:
    embeddings = _FakeEmbeddings()


class _BadEmbeddingResponse:
    data = [type("EmbeddingRow", (), {"embedding": [1.0, 0.0]})()]


class _BadEmbeddings:
    def create(self, **_: object) -> _BadEmbeddingResponse:
        return _BadEmbeddingResponse()


class _BadOpenAIClient:
    embeddings = _BadEmbeddings()


def _test_database_url() -> str:
    database_url = os.getenv("TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("TEST_DATABASE_URL is required for vector search integration tests.")
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


def _insert_document(
    connection,
    *,
    source_id: str,
    embedding: list[float],
    embedding_status: str = "completed",
) -> None:
    now = datetime.now(timezone.utc)
    connection.execute(
        text(
            """
            INSERT INTO documents (
                id,
                document_type,
                source_type,
                source_system,
                source_id,
                domain,
                title,
                effective_from,
                effective_to,
                text,
                embedding,
                embedding_status,
                embedding_model,
                embedding_version,
                embedding_dimensions,
                embedded_at,
                created_at,
                updated_at
            )
            VALUES (
                :id,
                'law_article',
                'legislation',
                'bwb',
                :source_id,
                'tenancy_law',
                :source_id,
                :effective_from,
                :effective_to,
                :text,
                CAST(:embedding AS extensions.vector),
                :embedding_status,
                'text-embedding-3-small',
                'v1',
                1536,
                :created_at,
                :created_at,
                :updated_at
            )
            """
        ),
        {
            "id": uuid.uuid4(),
            "source_id": source_id,
            "effective_from": date(1900, 1, 1),
            "effective_to": date(9999, 12, 31),
            "text": f"{source_id} text",
            "embedding": "[" + ",".join(str(value) for value in embedding) + "]",
            "embedding_status": embedding_status,
            "created_at": now,
            "updated_at": now,
        },
    )


def test_vector_search_orders_by_pgvector_distance(monkeypatch: pytest.MonkeyPatch) -> None:
    database_url = _test_database_url()
    monkeypatch.setenv("DATABASE_URL", database_url)
    _reset_and_migrate(database_url)

    engine = create_engine(database_url, future=True)
    with engine.begin() as connection:
        _insert_document(connection, source_id="near", embedding=[1.0] + [0.0] * 1535)
        _insert_document(connection, source_id="far", embedding=[0.0, 1.0] + [0.0] * 1534)
    engine.dispose()

    import search

    search = importlib.reload(search)
    monkeypatch.setattr(search, "get_openai_client", lambda: _FakeOpenAIClient())

    hits = search.vector_search("huur", limit=2)

    assert [hit.source_id for hit in hits] == ["near", "far"]
    assert hits[0].score > hits[1].score


def test_vector_search_ignores_stale_embeddings(monkeypatch: pytest.MonkeyPatch) -> None:
    database_url = _test_database_url()
    monkeypatch.setenv("DATABASE_URL", database_url)
    _reset_and_migrate(database_url)

    engine = create_engine(database_url, future=True)
    with engine.begin() as connection:
        _insert_document(connection, source_id="fresh", embedding=[1.0] + [0.0] * 1535)
        _insert_document(
            connection,
            source_id="stale",
            embedding=[1.0] + [0.0] * 1535,
            embedding_status="stale",
        )
    engine.dispose()

    import search

    search = importlib.reload(search)
    monkeypatch.setattr(search, "get_openai_client", lambda: _FakeOpenAIClient())

    hits = search.vector_search("huur", limit=5)

    assert [hit.source_id for hit in hits] == ["fresh"]


def test_vector_search_rejects_wrong_embedding_dimensions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import search

    search = importlib.reload(search)
    monkeypatch.setattr(search, "get_openai_client", lambda: _BadOpenAIClient())

    with pytest.raises(ValueError, match="expected 1536"):
        search.vector_search("huur", limit=1)
