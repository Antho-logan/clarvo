"""Tests for BM25, vector, and hybrid search paths in search.py."""

from __future__ import annotations

import importlib
import uuid
from datetime import date, datetime, timezone

import pytest
from sqlalchemy import text
from sqlalchemy.engine import Engine


class _FakeEmbeddingResponse:
    data = [type("Row", (), {"embedding": [1.0] + [0.0] * 1535})()]


class _FakeEmbeddings:
    def create(self, **_: object) -> _FakeEmbeddingResponse:
        return _FakeEmbeddingResponse()


class _FakeOpenAIClient:
    embeddings = _FakeEmbeddings()


def _insert_document(
    engine: Engine,
    *,
    source_id: str,
    text_value: str,
    domain: str = "employment_law",
    document_type: str = "law_article",
    source_type: str = "legislation",
    embedding: list[float] | None = None,
) -> None:
    embedding_literal: str | None = None
    if embedding is not None:
        embedding_literal = "[" + ",".join(str(v) for v in embedding) + "]"
    now = datetime.now(timezone.utc)
    params: dict[str, object] = {
        "id": uuid.uuid4(),
        "document_type": document_type,
        "source_type": source_type,
        "source_id": source_id,
        "domain": domain,
        "effective_from": date(1900, 1, 1),
        "effective_to": date(9999, 12, 31),
        "text": text_value,
        "now": now,
    }
    with engine.begin() as conn:
        if embedding_literal is None:
            conn.execute(
                text(
                    """
                    INSERT INTO documents (
                        id, document_type, source_type, source_system, source_id,
                        domain, title, effective_from, effective_to, text,
                        embedding, created_at, updated_at
                    )
                    VALUES (
                        :id, :document_type, :source_type, 'system', :source_id,
                        :domain, :source_id, :effective_from, :effective_to, :text,
                        NULL, :now, :now
                    )
                    """
                ),
                params,
            )
        else:
            params["embedding"] = embedding_literal
            conn.execute(
                text(
                    """
                    INSERT INTO documents (
                        id, document_type, source_type, source_system, source_id,
                        domain, title, effective_from, effective_to, text,
                        embedding, embedding_status, embedding_model,
                        embedding_version, embedding_dimensions, embedded_at,
                        created_at, updated_at
                    )
                    VALUES (
                        :id, :document_type, :source_type, 'system', :source_id,
                        :domain, :source_id, :effective_from, :effective_to, :text,
                        CAST(:embedding AS vector), 'completed', 'text-embedding-3-small',
                        'v1', 1536, :now,
                        :now, :now
                    )
                    """
                ),
                params,
            )


def _reload_search(monkeypatch: pytest.MonkeyPatch):
    import search

    reloaded = importlib.reload(search)
    monkeypatch.setattr(reloaded, "get_openai_client", lambda: _FakeOpenAIClient())
    return reloaded


def test_bm25_search_returns_ranked_hits(
    db_engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    _insert_document(
        db_engine,
        source_id="BWBR-01",
        text_value="Opzegtermijn voor werknemer is twee maanden.",
    )
    _insert_document(
        db_engine,
        source_id="BWBR-02",
        text_value="Huurcontract bepalingen en opzegging.",
        domain="tenancy_law",
    )
    search = _reload_search(monkeypatch)

    hits = search.bm25_search("opzegtermijn werknemer", limit=5)
    assert hits
    assert hits[0].source_id == "BWBR-01"
    assert hits[0].source == "bm25"
    assert all(hit.score > 0 for hit in hits)


def test_bm25_search_respects_domain_filter(
    db_engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    _insert_document(
        db_engine,
        source_id="BWBR-03",
        text_value="Opzegging arbeid.",
        domain="employment_law",
    )
    _insert_document(
        db_engine,
        source_id="BWBR-04",
        text_value="Opzegging huur.",
        domain="tenancy_law",
    )
    search = _reload_search(monkeypatch)

    filtered = search.bm25_search("opzegging", domain="tenancy_law")
    assert [hit.source_id for hit in filtered] == ["BWBR-04"]


def test_bm25_search_respects_source_type_filter(
    db_engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    _insert_document(
        db_engine,
        source_id="BWBR-05",
        text_value="Loon bij ziekte regeling.",
        source_type="legislation",
    )
    _insert_document(
        db_engine,
        source_id="ECLI-05",
        text_value="Loon bij ziekte uitspraak.",
        source_type="case_law",
        document_type="judgment",
    )
    search = _reload_search(monkeypatch)

    filtered = search.bm25_search("loon", source_type="case_law")
    assert [hit.source_id for hit in filtered] == ["ECLI-05"]


def test_vector_search_uses_pgvector_cosine(
    db_engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    near = [1.0] + [0.0] * 1535
    far = [0.0, 1.0] + [0.0] * 1534
    _insert_document(db_engine, source_id="near-id", text_value="near text", embedding=near)
    _insert_document(db_engine, source_id="far-id", text_value="far text", embedding=far)
    search = _reload_search(monkeypatch)

    hits = search.vector_search("query tekst", limit=5)
    assert [hit.source_id for hit in hits] == ["near-id", "far-id"]
    assert hits[0].score > hits[1].score
    assert hits[0].source == "vector"


def test_hybrid_search_combines_scores(
    db_engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    near = [1.0] + [0.0] * 1535
    far = [0.0, 1.0] + [0.0] * 1534
    _insert_document(
        db_engine,
        source_id="hybrid-near",
        text_value="Opzegtermijn werknemer.",
        embedding=near,
    )
    _insert_document(
        db_engine,
        source_id="hybrid-far",
        text_value="Iets anders tekst.",
        embedding=far,
    )
    search = _reload_search(monkeypatch)

    hits = search.hybrid_search("opzegtermijn", k_bm25=5, k_vector=5)
    assert hits
    assert hits[0].source == "hybrid"
    ids = [hit.source_id for hit in hits]
    assert "hybrid-near" in ids


def test_document_to_hit_helper_preserves_fields() -> None:
    from backend_common import Document

    document = Document(
        id=uuid.uuid4(),
        document_type="law_article",
        source_type="legislation",
        source_system="bwb",
        source_id="BWBR-HIT",
        domain="employment_law",
        title="Titel",
        effective_from=date(1900, 1, 1),
        effective_to=date(9999, 12, 31),
        text="text",
    )
    import search

    hit = search._document_to_hit(document, score=0.42, source="bm25")
    assert hit.source_id == "BWBR-HIT"
    assert hit.score == pytest.approx(0.42)
    assert hit.source == "bm25"
