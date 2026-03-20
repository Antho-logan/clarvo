"""
Hybrid search over Dutch / European legal documents.

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
from typing import Iterable

from sqlalchemy import bindparam, text

from backend_common import (
    DEFAULT_EMBEDDING_MODEL,
    Document,
    SearchHit,
    cosine_similarity,
    deserialize_embedding,
    get_logger,
    get_openai_client,
    get_session_factory,
    normalize_scores,
)


LOGGER = get_logger("search")
SESSION_FACTORY = get_session_factory()


def _document_to_hit(document: Document, score: float, source: str) -> SearchHit:
    """Convert a SQLAlchemy row into a typed search result."""
    return SearchHit(
        id=str(document.id),
        document_type=document.document_type,
        source_type=document.source_type,
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
        score=float(score),
        source=source,
    )


def bm25_search(
    query: str,
    limit: int = 10,
    *,
    source_type: str | None = None,
    domain: str | None = None,
) -> list[SearchHit]:
    """
    Run a PostgreSQL full-text search and return BM25-style ranked results.

    PostgreSQL core does not expose a native BM25 function. This implementation
    uses `ts_rank_cd`, which is the closest built-in ranking strategy and is
    commonly used as a BM25-like ranking proxy in pure Postgres setups.
    """
    sql = text(
        """
        WITH ranked AS (
            SELECT
                id,
                document_type,
                source_type,
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
            ORDER BY score DESC
            LIMIT :limit
        )
        SELECT * FROM ranked
        """
    ).bindparams(
        bindparam("query"),
        bindparam("limit"),
        bindparam("source_type"),
        bindparam("domain"),
    )

    with SESSION_FACTORY() as session:
        rows = session.execute(
            sql,
            {
                "query": query,
                "limit": limit,
                "source_type": source_type,
                "domain": domain,
            },
        ).mappings().all()

    hits = [
        SearchHit(
            id=str(row["id"]),
            document_type=row["document_type"],
            source_type=row["source_type"],
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
) -> list[SearchHit]:
    """Search serialized embeddings using in-Python cosine similarity."""
    client = get_openai_client()
    embedding_response = client.embeddings.create(model=DEFAULT_EMBEDDING_MODEL, input=query)
    query_embedding = embedding_response.data[0].embedding

    with SESSION_FACTORY() as session:
        query_builder = session.query(Document).filter(Document.embedding.is_not(None))
        if source_type is not None:
            query_builder = query_builder.filter(Document.source_type == source_type)
        if domain is not None:
            query_builder = query_builder.filter(Document.domain == domain)
        documents = query_builder.all()

    hits = []
    for document in documents:
        embedding = deserialize_embedding(document.embedding)
        if not embedding:
            continue
        hits.append(_document_to_hit(document, cosine_similarity(query_embedding, embedding), "vector"))

    hits = sorted(hits, key=lambda item: item.score, reverse=True)[:limit]
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
) -> list[SearchHit]:
    """
    Combine BM25 and vector hits into a single ranked result set.

    Score combination strategy:
    - Normalize BM25 scores to [0, 1]
    - Normalize vector scores to [0, 1]
    - Sum the normalized values
    """
    bm25_hits = bm25_search(query, limit=k_bm25, source_type=source_type, domain=domain)
    vector_hits = vector_search(query, limit=k_vector, source_type=source_type, domain=domain)

    bm25_normalized = normalize_scores({hit.id: hit.score for hit in bm25_hits})
    vector_normalized = normalize_scores({hit.id: hit.score for hit in vector_hits})

    merged: dict[str, SearchHit] = {}
    for hit in bm25_hits + vector_hits:
        combined_score = bm25_normalized.get(hit.id, 0.0) + vector_normalized.get(hit.id, 0.0)
        if hit.id not in merged or combined_score > merged[hit.id].score:
            merged[hit.id] = SearchHit(
                id=hit.id,
                document_type=hit.document_type,
                source_type=hit.source_type,
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
        print(f"[{index}] article={hit.article!r} bwbr_id={hit.bwbr_id!r} score={hit.score:.4f}")
        print(f"    {preview}")
        print()


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Run hybrid legal document search.")
    parser.add_argument("query", help="The legal search query to execute.")
    parser.add_argument("--k-bm25", type=int, default=5, help="Number of full-text results to retrieve.")
    parser.add_argument("--k-vector", type=int, default=5, help="Number of vector results to retrieve.")
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
