"""
Hybrid search over Dutch legal documents.

This module combines:
1. BM25-style PostgreSQL full-text search using `tsvector` and `tsquery`.
2. pgvector cosine similarity search.
3. A simple normalized score fusion strategy.

Environment variables:
- DATABASE_URL
- OPENAI_API_KEY
- OPENAI_EMBEDDING_MODEL (optional)

Example:
    python search.py "opzegtermijn huur artikel 7:271 BW"
"""

from __future__ import annotations

import argparse
import os
from typing import Iterable

from sqlalchemy import bindparam, text

from backend_common import (
    DEFAULT_EMBEDDING_MODEL,
    DEFAULT_EMBEDDING_VERSION,
    Document,
    EMBEDDING_DIMENSIONS,
    EMBEDDING_STATUS_COMPLETED,
    SearchHit,
    get_logger,
    get_openai_client,
    get_session_factory,
    normalize_scores,
    validate_embedding_dimensions,
)

LOGGER = get_logger("search")


def _document_to_hit(document: Document, score: float, source: str) -> SearchHit:
    """Convert a SQLAlchemy row into a typed search result."""
    return SearchHit(
        id=str(document.id),
        document_type=document.document_type,
        source_type=document.source_type,
        source_system=document.source_system,
        source_id=document.source_id,
        domain=document.domain,
        bwbr_id=document.bwbr_id,
        ecli=document.ecli,
        article=document.article,
        section=document.section,
        title=document.title,
        court=document.court,
        decision_date=document.decision_date,
        subject=document.subject,
        text=document.text,
        source_url=document.source_url,
        embedding_status=document.embedding_status,
        score=float(score),
        source=source,
    )


def bm25_search(
    query: str,
    limit: int = 10,
    *,
    source_type: str | None = None,
    domain: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[SearchHit]:
    """
    Run a PostgreSQL full-text search and return BM25-style ranked results.

    PostgreSQL core does not expose a native BM25 function. This implementation
    uses `ts_rank_cd`, which is the closest built-in ranking strategy and is
    commonly used as a BM25-like ranking proxy in pure Postgres setups.
    """
    sql = text("""
        WITH ranked AS (
            SELECT
                id,
                document_type,
                source_type,
                source_system,
                source_id,
                domain,
                bwbr_id,
                ecli,
                article,
                section,
                title,
                court,
                decision_date,
                subject,
                text,
                source_url,
                embedding_status,
                ts_rank_cd(
                    to_tsvector(
                        'dutch',
                        coalesce(title, '') || ' ' ||
                        coalesce(article, '') || ' ' ||
                        coalesce(section, '') || ' ' ||
                        coalesce(text, '')
                    ),
                    websearch_to_tsquery('dutch', :query)
                ) AS score
            FROM documents
            WHERE to_tsvector(
                'dutch',
                coalesce(title, '') || ' ' ||
                coalesce(article, '') || ' ' ||
                coalesce(section, '') || ' ' ||
                coalesce(text, '')
            ) @@ websearch_to_tsquery('dutch', :query)
              AND (CAST(:source_type AS TEXT) IS NULL OR source_type = CAST(:source_type AS TEXT))
              AND (CAST(:domain AS TEXT) IS NULL OR domain = CAST(:domain AS TEXT))
              AND (
                CAST(:date_from AS DATE) IS NULL
                OR coalesce(decision_date, effective_from) >= CAST(:date_from AS DATE)
              )
              AND (
                CAST(:date_to AS DATE) IS NULL
                OR coalesce(decision_date, effective_to) <= CAST(:date_to AS DATE)
              )
            ORDER BY score DESC
            LIMIT :limit
        )
        SELECT * FROM ranked
        """).bindparams(
        bindparam("query"),
        bindparam("limit"),
        bindparam("source_type"),
        bindparam("domain"),
        bindparam("date_from"),
        bindparam("date_to"),
    )

    session_factory = get_session_factory()
    with session_factory() as session:
        rows = (
            session.execute(
                sql,
                {
                    "query": query,
                    "limit": limit,
                    "source_type": source_type,
                    "domain": domain,
                    "date_from": date_from,
                    "date_to": date_to,
                },
            )
            .mappings()
            .all()
        )

    hits = [
        SearchHit(
            id=str(row["id"]),
            document_type=row["document_type"],
            source_type=row["source_type"],
            source_system=row["source_system"],
            source_id=row["source_id"],
            domain=row["domain"],
            bwbr_id=row["bwbr_id"],
            ecli=row["ecli"],
            article=row["article"],
            section=row["section"],
            title=row["title"],
            court=row["court"],
            decision_date=row["decision_date"],
            subject=row["subject"],
            text=row["text"],
            source_url=row["source_url"],
            embedding_status=row["embedding_status"],
            score=float(row["score"]),
            source="bm25",
        )
        for row in rows
    ]
    LOGGER.info(
        "BM25 returned %s hits for query=%r source_type=%r domain=%r",
        len(hits),
        query,
        source_type,
        domain,
    )
    return hits


def vector_search(
    query: str,
    limit: int = 10,
    *,
    source_type: str | None = None,
    domain: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[SearchHit]:
    """Search document embeddings using pgvector cosine distance in PostgreSQL."""
    client = get_openai_client()
    embedding_response = client.embeddings.create(
        model=DEFAULT_EMBEDDING_MODEL, input=query
    )
    query_embedding = validate_embedding_dimensions(
        embedding_response.data[0].embedding
    )
    query_vector = "[" + ",".join(str(float(value)) for value in query_embedding) + "]"
    candidate_limit = max(limit * 20, 100)

    sql = text("""
        WITH ann_candidates AS MATERIALIZED (
            SELECT
                id,
                document_type,
                source_type,
                source_system,
                source_id,
                domain,
                bwbr_id,
                ecli,
                article,
                section,
                title,
                court,
                decision_date,
                effective_from,
                effective_to,
                subject,
                text,
                source_url,
                embedding_status,
                embedding_model,
                embedding_version,
                embedding_dimensions,
                embedding <=> CAST(:query_vector AS vector) AS distance
            FROM documents
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> CAST(:query_vector AS vector)
            LIMIT :candidate_limit
        )
        SELECT
            id,
            document_type,
            source_type,
            source_system,
            source_id,
            domain,
            bwbr_id,
            ecli,
            article,
            section,
            title,
            court,
            decision_date,
            subject,
            text,
            source_url,
            embedding_status,
            1 - distance AS score
        FROM ann_candidates
        WHERE embedding_status = :embedding_status
          AND embedding_model = :embedding_model
          AND embedding_version = :embedding_version
          AND embedding_dimensions = :embedding_dimensions
          AND (CAST(:source_type AS TEXT) IS NULL OR source_type = CAST(:source_type AS TEXT))
          AND (CAST(:domain AS TEXT) IS NULL OR domain = CAST(:domain AS TEXT))
          AND (
            CAST(:date_from AS DATE) IS NULL
            OR coalesce(decision_date, effective_from) >= CAST(:date_from AS DATE)
          )
          AND (
            CAST(:date_to AS DATE) IS NULL
            OR coalesce(decision_date, effective_to) <= CAST(:date_to AS DATE)
          )
        ORDER BY distance
        LIMIT :limit
        """).bindparams(
        bindparam("query_vector"),
        bindparam("candidate_limit"),
        bindparam("limit"),
        bindparam("embedding_status"),
        bindparam("embedding_model"),
        bindparam("embedding_version"),
        bindparam("embedding_dimensions"),
        bindparam("source_type"),
        bindparam("domain"),
        bindparam("date_from"),
        bindparam("date_to"),
    )

    session_factory = get_session_factory()
    with session_factory() as session:
        rows = (
            session.execute(
                sql,
                {
                    "query_vector": query_vector,
                    "candidate_limit": candidate_limit,
                    "limit": limit,
                    "embedding_status": EMBEDDING_STATUS_COMPLETED,
                    "embedding_model": DEFAULT_EMBEDDING_MODEL,
                    "embedding_version": DEFAULT_EMBEDDING_VERSION,
                    "embedding_dimensions": EMBEDDING_DIMENSIONS,
                    "source_type": source_type,
                    "domain": domain,
                    "date_from": date_from,
                    "date_to": date_to,
                },
            )
            .mappings()
            .all()
        )

    hits = [
        SearchHit(
            id=str(row["id"]),
            document_type=row["document_type"],
            source_type=row["source_type"],
            source_system=row["source_system"],
            source_id=row["source_id"],
            domain=row["domain"],
            bwbr_id=row["bwbr_id"],
            ecli=row["ecli"],
            article=row["article"],
            section=row["section"],
            title=row["title"],
            court=row["court"],
            decision_date=row["decision_date"],
            subject=row["subject"],
            text=row["text"],
            source_url=row["source_url"],
            embedding_status=row["embedding_status"],
            score=float(row["score"]),
            source="vector",
        )
        for row in rows
    ]
    LOGGER.info(
        "Vector search returned %s hits for query=%r source_type=%r domain=%r",
        len(hits),
        query,
        source_type,
        domain,
    )
    return hits


def hybrid_search(
    query: str,
    k_bm25: int = 5,
    k_vector: int = 5,
    *,
    source_type: str | None = None,
    domain: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[SearchHit]:
    """
    Combine BM25 and vector hits into a single ranked result set.

    Score combination strategy:
    - Normalize BM25 scores to [0, 1].
    - Normalize pgvector cosine-similarity scores to [0, 1].
    - Sum the normalized values.

    This weighted-sum-free fusion is intentionally conservative for Phase 1:
    it preserves existing BM25 behaviour while allowing SQL-side vector hits to
    contribute equally once embeddings are populated.
    """
    bm25_hits = bm25_search(
        query,
        limit=k_bm25,
        source_type=source_type,
        domain=domain,
        date_from=date_from,
        date_to=date_to,
    )
    if os.getenv("OPENAI_API_KEY"):
        vector_hits = vector_search(
            query,
            limit=k_vector,
            source_type=source_type,
            domain=domain,
            date_from=date_from,
            date_to=date_to,
        )
    else:
        LOGGER.info(
            "OPENAI_API_KEY is not configured; hybrid search is using BM25 only."
        )
        vector_hits = []

    bm25_normalized = normalize_scores({hit.id: hit.score for hit in bm25_hits})
    vector_normalized = normalize_scores({hit.id: hit.score for hit in vector_hits})

    merged: dict[str, SearchHit] = {}
    for hit in bm25_hits + vector_hits:
        combined_score = bm25_normalized.get(hit.id, 0.0) + vector_normalized.get(
            hit.id, 0.0
        )
        if hit.id not in merged or combined_score > merged[hit.id].score:
            merged[hit.id] = SearchHit(
                id=hit.id,
                document_type=hit.document_type,
                source_type=hit.source_type,
                source_system=hit.source_system,
                source_id=hit.source_id,
                domain=hit.domain,
                bwbr_id=hit.bwbr_id,
                ecli=hit.ecli,
                article=hit.article,
                section=hit.section,
                title=hit.title,
                court=hit.court,
                decision_date=hit.decision_date,
                subject=hit.subject,
                text=hit.text,
                source_url=hit.source_url,
                embedding_status=hit.embedding_status,
                score=combined_score,
                source="hybrid",
            )

    results = sorted(merged.values(), key=lambda item: item.score, reverse=True)
    LOGGER.info(
        "Hybrid search returned %s merged hits for query=%r source_type=%r domain=%r",
        len(results),
        query,
        source_type,
        domain,
    )
    return results


def _print_hits(hits: Iterable[SearchHit], limit: int = 5) -> None:
    """Pretty-print a short CLI demo view of the top results."""
    for index, hit in enumerate(list(hits)[:limit], start=1):
        preview = hit.text[:400].replace("\n", " ")
        print(
            f"[{index}] article={hit.article!r} bwbr_id={hit.bwbr_id!r} score={hit.score:.4f}"
        )
        print(f"    {preview}")
        print()


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Run hybrid legal document search.")
    parser.add_argument("query", help="The legal search query to execute.")
    parser.add_argument(
        "--k-bm25", type=int, default=5, help="Number of full-text results to retrieve."
    )
    parser.add_argument(
        "--k-vector", type=int, default=5, help="Number of vector results to retrieve."
    )
    parser.add_argument("--source-type", help="Optional source_type filter.")
    parser.add_argument("--domain", help="Optional domain filter.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    top_hits = hybrid_search(
        args.query,
        k_bm25=args.k_bm25,
        k_vector=args.k_vector,
        source_type=args.source_type,
        domain=args.domain,
    )
    _print_hits(top_hits, limit=5)
