"""
Generate and store document embeddings in PostgreSQL.

This script scans embedding lifecycle state, batches candidate documents to stay
below the requested 2048-token limit per OpenAI embedding call, then stores the
resulting vectors and lifecycle metadata.

Environment variables:
- DATABASE_URL: PostgreSQL SQLAlchemy URL.
- OPENAI_API_KEY: OpenAI API key.
- OPENAI_EMBEDDING_MODEL: defaults to text-embedding-3-small

Examples:
    export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/venice"
    export OPENAI_API_KEY="sk-..."
    python create_embeddings.py
    python create_embeddings.py --limit 200 --page-size 100
"""

from __future__ import annotations

import argparse
import json
import os
from typing import Optional

from tenacity import retry, stop_after_attempt, wait_exponential

from backend_common import (
    DEFAULT_EMBEDDING_MODEL,
    chunk_items_by_token_limit,
    compact_text,
    get_logger,
    get_openai_client,
    get_session_factory,
    validate_embedding_dimensions,
)
from repositories.embeddings import (
    EmbeddingMode,
    fetch_embedding_candidates,
    mark_embedding_attempt,
    mark_embedding_completed,
    mark_embedding_failed,
    mark_embedding_lifecycle_states,
)
from repositories.ingestion_jobs import (
    create_job,
    finalize_job,
    mark_job_running,
    upsert_job_item,
)


LOGGER = get_logger("create_embeddings")
DEFAULT_CHECKPOINT_PATH = ".embedding_checkpoint.json"


@retry(wait=wait_exponential(multiplier=1, min=1, max=30), stop=stop_after_attempt(5), reraise=True)
def _create_embedding_batch(client, *, texts: list[str]):
    """Call OpenAI embeddings with retry/backoff for transient API failures."""
    return client.embeddings.create(
        model=DEFAULT_EMBEDDING_MODEL,
        input=texts,
    )


def _write_checkpoint(path: str, *, processed_count: int, last_document_id: str | None) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(
            {
                "processed_count": processed_count,
                "last_document_id": last_document_id,
                "embedding_model": DEFAULT_EMBEDDING_MODEL,
            },
            handle,
            indent=2,
        )


def _source_identifier(document) -> str:
    return document.source_id or document.ecli or document.bwbr_id or str(document.id)


def _record_job_item(
    document,
    *,
    job_id: int,
    status: str,
    error_message: str | None = None,
) -> None:
    upsert_job_item(
        job_id=job_id,
        source_type=document.source_type or document.document_type,
        source_system=document.source_system or "documents",
        source_identifier=_source_identifier(document),
        domain=document.domain,
        status=status,
        error_message=error_message,
        inserted_count=1 if status == "success" else 0,
    )


def create_embeddings(
    limit: Optional[int] = None,
    *,
    page_size: int = 500,
    mode: EmbeddingMode = "all",
    retry_failed: bool = False,
    job_id: int | None = None,
) -> dict[str, int | str | None]:
    """Generate embeddings and write lifecycle metadata back to PostgreSQL."""
    if page_size < 1:
        raise ValueError("page_size must be at least 1.")
    if mode not in {"missing", "stale", "failed", "all"}:
        raise ValueError("mode must be one of: missing, stale, failed, all.")

    session_factory = get_session_factory()
    client = get_openai_client()
    checkpoint_path = os.getenv("EMBEDDING_CHECKPOINT_PATH", DEFAULT_CHECKPOINT_PATH)
    processed_count = 0
    failure_count = 0
    scanned = mark_embedding_lifecycle_states(
        limit=None,
        page_size=page_size,
        retry_failed=retry_failed,
    )

    if job_id is None:
        job = create_job(
            job_type=f"embedding_{mode}",
            source_system="openai_embeddings",
            domain=None,
            total_items=0,
            notes=f"embedding lifecycle scan: {scanned}",
            status="running",
        )
        job_id = job.id
    else:
        mark_job_running(
            job_id,
            notes=f"embedding lifecycle scan: {scanned}",
        )

    try:
        with session_factory() as session:
            while True:
                attempted_count = processed_count + failure_count
                remaining = None if limit is None else limit - attempted_count
                documents = fetch_embedding_candidates(
                    session,
                    mode=mode,
                    page_size=page_size,
                    remaining=remaining,
                    retry_failed=retry_failed,
                    exclude_job_id=job_id,
                )
                if not documents:
                    if processed_count == 0:
                        LOGGER.info("No embedding candidates were found for mode=%s.", mode)
                    break

                LOGGER.info(
                    "Embedding up to %s documents using %s",
                    len(documents),
                    DEFAULT_EMBEDDING_MODEL,
                )
                batched_inputs = [
                    (document, compact_text(document.text)[:8000]) for document in documents
                ]

                for batch in chunk_items_by_token_limit(batched_inputs, max_tokens=2048):
                    docs = [item[0] for item in batch]
                    texts = [item[1] for item in batch]
                    for document in docs:
                        mark_embedding_attempt(document, job_id=job_id)
                        _record_job_item(document, job_id=job_id, status="running")
                    session.commit()

                    try:
                        response = _create_embedding_batch(client, texts=texts)
                        if len(response.data) != len(docs):
                            raise RuntimeError(
                                f"Embedding API returned {len(response.data)} vectors for {len(docs)} documents."
                            )
                    except Exception as exc:
                        error = str(exc)
                        for document in docs:
                            mark_embedding_failed(document, error=error, job_id=job_id)
                            _record_job_item(
                                document,
                                job_id=job_id,
                                status="failed",
                                error_message=error,
                            )
                        session.commit()
                        failure_count += len(docs)
                        LOGGER.exception("Embedding batch failed for %s documents.", len(docs))
                        continue

                    for document, embedding_row in zip(docs, response.data):
                        try:
                            embedding = validate_embedding_dimensions(embedding_row.embedding)
                        except Exception as exc:
                            error = str(exc)
                            mark_embedding_failed(document, error=error, job_id=job_id)
                            _record_job_item(
                                document,
                                job_id=job_id,
                                status="failed",
                                error_message=error,
                            )
                            failure_count += 1
                            continue

                        mark_embedding_completed(document, embedding=embedding, job_id=job_id)
                        _record_job_item(document, job_id=job_id, status="success")
                        processed_count += 1

                    session.commit()
                    _write_checkpoint(
                        checkpoint_path,
                        processed_count=processed_count,
                        last_document_id=str(docs[-1].id) if docs else None,
                    )
                    LOGGER.info(
                        "Stored embeddings for batch of %s documents; failures so far=%s.",
                        len(docs),
                        failure_count,
                    )

                    if limit is not None and processed_count + failure_count >= limit:
                        break

                if limit is not None and processed_count + failure_count >= limit:
                    break
    except Exception as exc:
        finalize_job(
            job_id,
            status="failed",
            success_count=processed_count,
            failure_count=failure_count,
            notes=f"embedding {mode} failed before completion: {exc}",
        )
        raise

    status = "completed_with_errors" if failure_count else "completed"
    finalize_job(
        job_id,
        status=status,
        success_count=processed_count,
        failure_count=failure_count,
        notes=f"embedding {mode} finished: {processed_count} completed, {failure_count} failed",
    )
    return {
        "job_id": job_id,
        "mode": mode,
        "processed_count": processed_count,
        "failure_count": failure_count,
    }


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Generate embeddings for legal documents.")
    parser.add_argument("--limit", type=int, default=None, help="Optional max number of documents to process.")
    parser.add_argument(
        "--page-size",
        type=int,
        default=500,
        help="Number of candidate documents fetched from Postgres at a time.",
    )
    parser.add_argument(
        "--mode",
        choices=["missing", "stale", "failed", "all"],
        default="all",
        help="Embedding lifecycle candidates to process.",
    )
    parser.add_argument(
        "--retry-failed",
        action="store_true",
        help="Include failed embedding rows in eligible candidates.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    result = create_embeddings(
        limit=args.limit,
        page_size=args.page_size,
        mode=args.mode,
        retry_failed=args.retry_failed,
    )
    LOGGER.info("Embedding run finished: %s", result)
