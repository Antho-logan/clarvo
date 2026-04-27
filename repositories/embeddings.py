"""Embedding lifecycle helpers for document pgvector rows."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Literal

from sqlalchemy import func
from sqlalchemy import or_
from sqlalchemy.orm import Session

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
    compact_text,
    get_session_factory,
    utcnow,
)

EmbeddingMode = Literal["missing", "stale", "failed", "all"]


@dataclass(frozen=True)
class EmbeddingLifecycleState:
    """Deterministic embedding state for one document row."""

    status: str
    reason: str
    source_hash: str | None
    should_embed: bool


@dataclass(frozen=True)
class EmbeddingCoverageRow:
    """Aggregated embedding coverage bucket."""

    source_type: str | None
    source_system: str | None
    domain: str | None
    embedding_status: str
    embedding_model: str | None
    embedding_version: str | None
    embedding_dimensions: int | None
    count: int

    def as_dict(self) -> dict[str, object]:
        return {
            "source_type": self.source_type,
            "source_system": self.source_system,
            "domain": self.domain,
            "embedding_status": self.embedding_status,
            "embedding_model": self.embedding_model,
            "embedding_version": self.embedding_version,
            "embedding_dimensions": self.embedding_dimensions,
            "count": self.count,
        }


def embedding_source_hash(text: str) -> str:
    """Return the content fingerprint used to detect stale embeddings."""
    normalized = compact_text(text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def classify_embedding_state(
    document: Document,
    *,
    model: str = DEFAULT_EMBEDDING_MODEL,
    version: str = DEFAULT_EMBEDDING_VERSION,
    dimensions: int = EMBEDDING_DIMENSIONS,
    retry_failed: bool = False,
) -> EmbeddingLifecycleState:
    """Classify whether a document row needs an embedding operation."""
    normalized_text = compact_text(document.text)
    if not normalized_text:
        return EmbeddingLifecycleState(
            status=EMBEDDING_STATUS_SKIPPED,
            reason="blank_text",
            source_hash=None,
            should_embed=False,
        )

    source_hash = embedding_source_hash(normalized_text)

    if document.embedding_status == EMBEDDING_STATUS_FAILED and not retry_failed:
        return EmbeddingLifecycleState(
            status=EMBEDDING_STATUS_FAILED,
            reason="previous_failure",
            source_hash=source_hash,
            should_embed=False,
        )

    if document.embedding is None:
        return EmbeddingLifecycleState(
            status=EMBEDDING_STATUS_PENDING,
            reason="missing_embedding",
            source_hash=source_hash,
            should_embed=True,
        )

    if document.embedding_status == EMBEDDING_STATUS_STALE:
        return EmbeddingLifecycleState(
            status=EMBEDDING_STATUS_STALE,
            reason="marked_stale",
            source_hash=source_hash,
            should_embed=True,
        )

    if document.embedding_model != model:
        return EmbeddingLifecycleState(
            status=EMBEDDING_STATUS_STALE,
            reason="embedding_model_changed",
            source_hash=source_hash,
            should_embed=True,
        )

    if document.embedding_version != version:
        return EmbeddingLifecycleState(
            status=EMBEDDING_STATUS_STALE,
            reason="embedding_version_changed",
            source_hash=source_hash,
            should_embed=True,
        )

    if document.embedding_dimensions != dimensions:
        return EmbeddingLifecycleState(
            status=EMBEDDING_STATUS_STALE,
            reason="embedding_dimensions_changed",
            source_hash=source_hash,
            should_embed=True,
        )

    if document.embedding_source_hash != source_hash:
        return EmbeddingLifecycleState(
            status=EMBEDDING_STATUS_STALE,
            reason="source_text_changed",
            source_hash=source_hash,
            should_embed=True,
        )

    if document.embedding_status == EMBEDDING_STATUS_FAILED and retry_failed:
        return EmbeddingLifecycleState(
            status=EMBEDDING_STATUS_PENDING,
            reason="retry_failed",
            source_hash=source_hash,
            should_embed=True,
        )

    return EmbeddingLifecycleState(
        status=EMBEDDING_STATUS_COMPLETED,
        reason="fresh",
        source_hash=source_hash,
        should_embed=False,
    )


def _apply_lifecycle_state(document: Document, state: EmbeddingLifecycleState) -> bool:
    changed = False
    if document.embedding_status != state.status:
        document.embedding_status = state.status
        changed = True
    if document.embedding_source_hash != state.source_hash:
        document.embedding_source_hash = state.source_hash
        changed = True
    if (
        state.status in {EMBEDDING_STATUS_PENDING, EMBEDDING_STATUS_STALE}
        and document.embedding_error
    ):
        document.embedding_error = None
        changed = True
    if (
        state.status == EMBEDDING_STATUS_SKIPPED
        and document.embedding_error != state.reason
    ):
        document.embedding_error = state.reason
        changed = True
    return changed


def mark_embedding_lifecycle_states(
    *,
    limit: int | None = None,
    page_size: int = 500,
    model: str = DEFAULT_EMBEDDING_MODEL,
    version: str = DEFAULT_EMBEDDING_VERSION,
    dimensions: int = EMBEDDING_DIMENSIONS,
    retry_failed: bool = False,
) -> dict[str, int]:
    """Scan documents and update lifecycle status for missing/stale/skipped rows."""
    if page_size < 1:
        raise ValueError("page_size must be at least 1.")

    session_factory = get_session_factory()
    scanned = 0
    changed = 0
    status_counts: dict[str, int] = {}

    with session_factory() as session:
        offset = 0
        while True:
            remaining = None if limit is None else limit - scanned
            if remaining is not None and remaining <= 0:
                break
            fetch_size = (
                min(page_size, remaining) if remaining is not None else page_size
            )
            documents = (
                session.query(Document)
                .order_by(Document.id.asc())
                .offset(offset)
                .limit(fetch_size)
                .all()
            )
            if not documents:
                break
            offset += len(documents)

            for document in documents:
                scanned += 1
                state = classify_embedding_state(
                    document,
                    model=model,
                    version=version,
                    dimensions=dimensions,
                    retry_failed=retry_failed,
                )
                status_counts[state.status] = status_counts.get(state.status, 0) + 1
                if _apply_lifecycle_state(document, state):
                    changed += 1

            session.commit()

    return {"scanned": scanned, "changed": changed, **status_counts}


def fetch_embedding_candidates(
    session: Session,
    *,
    mode: EmbeddingMode,
    page_size: int,
    remaining: int | None,
    retry_failed: bool,
    exclude_job_id: int | None = None,
) -> list[Document]:
    """Fetch a deterministic batch of rows eligible for embedding work."""
    batch_size = min(page_size, remaining) if remaining is not None else page_size
    if batch_size <= 0:
        return []

    statuses = [EMBEDDING_STATUS_PENDING]
    if mode in {"stale", "all"}:
        statuses.append(EMBEDDING_STATUS_STALE)
    if mode in {"failed", "all"} and retry_failed:
        statuses.append(EMBEDDING_STATUS_FAILED)
    if mode == "failed" and not retry_failed:
        return []
    if mode == "stale":
        statuses = [EMBEDDING_STATUS_STALE]

    query = (
        session.query(Document)
        .filter(Document.embedding_status.in_(statuses))
        .filter(func.length(func.trim(Document.text)) > 0)
    )
    if exclude_job_id is not None:
        query = query.filter(
            or_(
                Document.last_embedding_job_id.is_(None),
                Document.last_embedding_job_id != exclude_job_id,
            )
        )
    return query.order_by(Document.id.asc()).limit(batch_size).all()


def mark_embedding_attempt(document: Document, *, job_id: int | None) -> None:
    """Record that an embedding attempt is starting for a document."""
    document.embedding_attempts = (document.embedding_attempts or 0) + 1
    document.embedding_status = EMBEDDING_STATUS_PENDING
    document.embedding_error = None
    document.last_embedding_job_id = job_id
    document.updated_at = utcnow()


def mark_embedding_completed(
    document: Document,
    *,
    embedding: list[float],
    model: str = DEFAULT_EMBEDDING_MODEL,
    version: str = DEFAULT_EMBEDDING_VERSION,
    dimensions: int = EMBEDDING_DIMENSIONS,
    job_id: int | None,
) -> None:
    """Write a successful embedding and all lifecycle metadata."""
    document.embedding = embedding
    document.embedding_model = model
    document.embedding_dimensions = dimensions
    document.embedding_version = version
    document.embedded_at = utcnow()
    document.embedding_status = EMBEDDING_STATUS_COMPLETED
    document.embedding_error = None
    document.embedding_source_hash = embedding_source_hash(document.text)
    document.last_embedding_job_id = job_id
    document.updated_at = utcnow()


def mark_embedding_failed(
    document: Document, *, error: str, job_id: int | None
) -> None:
    """Record a failed embedding attempt without deleting the source row."""
    document.embedding_status = EMBEDDING_STATUS_FAILED
    document.embedding_error = error[:2000]
    document.last_embedding_job_id = job_id
    document.updated_at = utcnow()


def get_embedding_coverage() -> list[EmbeddingCoverageRow]:
    """Return embedding coverage grouped by source and lifecycle metadata."""
    session_factory = get_session_factory()
    with session_factory() as session:
        rows = (
            session.query(
                Document.source_type,
                Document.source_system,
                Document.domain,
                Document.embedding_status,
                Document.embedding_model,
                Document.embedding_version,
                Document.embedding_dimensions,
                func.count(Document.id),
            )
            .group_by(
                Document.source_type,
                Document.source_system,
                Document.domain,
                Document.embedding_status,
                Document.embedding_model,
                Document.embedding_version,
                Document.embedding_dimensions,
            )
            .order_by(
                Document.source_type.asc().nulls_last(),
                Document.source_system.asc().nulls_last(),
                Document.domain.asc().nulls_last(),
                Document.embedding_status.asc(),
            )
            .all()
        )

    return [
        EmbeddingCoverageRow(
            source_type=row[0],
            source_system=row[1],
            domain=row[2],
            embedding_status=row[3],
            embedding_model=row[4],
            embedding_version=row[5],
            embedding_dimensions=row[6],
            count=int(row[7]),
        )
        for row in rows
    ]


def summarize_embedding_coverage(rows: list[EmbeddingCoverageRow]) -> dict[str, int]:
    """Collapse coverage rows into status totals."""
    totals: dict[str, int] = {}
    for row in rows:
        totals[row.embedding_status] = totals.get(row.embedding_status, 0) + row.count
    totals["total"] = sum(row.count for row in rows)
    return totals
