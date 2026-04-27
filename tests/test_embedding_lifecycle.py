from __future__ import annotations

import uuid
from datetime import date

from backend_common import (
    DEFAULT_EMBEDDING_MODEL,
    DEFAULT_EMBEDDING_VERSION,
    EMBEDDING_DIMENSIONS,
    EMBEDDING_STATUS_COMPLETED,
    EMBEDDING_STATUS_FAILED,
    EMBEDDING_STATUS_PENDING,
    EMBEDDING_STATUS_SKIPPED,
    EMBEDDING_STATUS_STALE,
    Document,
)
from repositories.embeddings import (
    EmbeddingCoverageRow,
    classify_embedding_state,
    embedding_source_hash,
    mark_embedding_attempt,
    mark_embedding_completed,
    mark_embedding_failed,
    summarize_embedding_coverage,
)


def _document(**overrides) -> Document:
    data = {
        "id": uuid.uuid4(),
        "document_type": "law_article",
        "source_type": "legislation",
        "source_system": "bwb",
        "source_id": "BWBR-test",
        "domain": "tenancy_law",
        "effective_from": date(1900, 1, 1),
        "effective_to": date(9999, 12, 31),
        "text": "Artikel over huur.",
        "embedding": None,
        "embedding_status": EMBEDDING_STATUS_PENDING,
        "embedding_attempts": 0,
    }
    data.update(overrides)
    return Document(**data)


def test_missing_embedding_is_pending_candidate() -> None:
    state = classify_embedding_state(_document())

    assert state.status == EMBEDDING_STATUS_PENDING
    assert state.reason == "missing_embedding"
    assert state.should_embed is True


def test_blank_text_is_skipped() -> None:
    state = classify_embedding_state(_document(text="  \n\t"))

    assert state.status == EMBEDDING_STATUS_SKIPPED
    assert state.reason == "blank_text"
    assert state.should_embed is False


def test_model_version_and_dimension_changes_are_stale() -> None:
    base = {
        "embedding": [1.0] + [0.0] * 1535,
        "embedding_status": EMBEDDING_STATUS_COMPLETED,
        "embedding_model": DEFAULT_EMBEDDING_MODEL,
        "embedding_version": DEFAULT_EMBEDDING_VERSION,
        "embedding_dimensions": EMBEDDING_DIMENSIONS,
        "embedding_source_hash": embedding_source_hash("Artikel over huur."),
    }

    assert classify_embedding_state(_document(**base), model="other-model").reason == "embedding_model_changed"
    assert classify_embedding_state(_document(**base), version="v2").reason == "embedding_version_changed"
    assert classify_embedding_state(_document(**base), dimensions=3072).reason == "embedding_dimensions_changed"


def test_text_change_marks_completed_embedding_stale() -> None:
    document = _document(
        embedding=[1.0] + [0.0] * 1535,
        embedding_status=EMBEDDING_STATUS_COMPLETED,
        embedding_model=DEFAULT_EMBEDDING_MODEL,
        embedding_version=DEFAULT_EMBEDDING_VERSION,
        embedding_dimensions=EMBEDDING_DIMENSIONS,
        embedding_source_hash=embedding_source_hash("Oude tekst."),
    )

    state = classify_embedding_state(document)

    assert state.status == EMBEDDING_STATUS_STALE
    assert state.reason == "source_text_changed"
    assert state.should_embed is True


def test_failed_embedding_requires_explicit_retry() -> None:
    document = _document(embedding_status=EMBEDDING_STATUS_FAILED, embedding_error="rate limit")

    blocked = classify_embedding_state(document)
    retryable = classify_embedding_state(document, retry_failed=True)

    assert blocked.status == EMBEDDING_STATUS_FAILED
    assert blocked.should_embed is False
    assert retryable.status == EMBEDDING_STATUS_PENDING
    assert retryable.should_embed is True


def test_attempt_complete_and_failure_metadata_updates() -> None:
    document = _document()

    mark_embedding_attempt(document, job_id=42)
    assert document.embedding_attempts == 1
    assert document.last_embedding_job_id == 42

    mark_embedding_completed(
        document,
        embedding=[1.0] + [0.0] * 1535,
        job_id=42,
    )
    assert document.embedding_status == EMBEDDING_STATUS_COMPLETED
    assert document.embedding_model == DEFAULT_EMBEDDING_MODEL
    assert document.embedding_dimensions == EMBEDDING_DIMENSIONS
    assert document.embedding_source_hash == embedding_source_hash(document.text)

    mark_embedding_failed(document, error="temporary failure", job_id=43)
    assert document.embedding_status == EMBEDDING_STATUS_FAILED
    assert document.embedding_error == "temporary failure"
    assert document.last_embedding_job_id == 43


def test_embedding_coverage_summary_totals_by_status() -> None:
    rows = [
        EmbeddingCoverageRow("legislation", "bwb", "tenancy_law", "completed", "m", "v1", 1536, 3),
        EmbeddingCoverageRow("case_law", "rechtspraak", "employment_law", "pending", None, None, None, 2),
        EmbeddingCoverageRow("case_law", "rechtspraak", "employment_law", "failed", None, None, None, 1),
    ]

    assert summarize_embedding_coverage(rows) == {
        "completed": 3,
        "pending": 2,
        "failed": 1,
        "total": 6,
    }
