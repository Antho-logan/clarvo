"""
Generate and store document embeddings in PostgreSQL.

This script reads documents without embeddings, batches them to stay below the
requested 2048-token limit per OpenAI embedding call, then stores the resulting
vectors in the `embedding` column.

Environment variables:
- DATABASE_URL: PostgreSQL SQLAlchemy URL.
- OPENAI_API_KEY: OpenAI API key.
- OPENAI_EMBEDDING_MODEL: defaults to text-embedding-3-small

Examples:
    export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/venice"
    export OPENAI_API_KEY="sk-..."
    python create_embeddings.py
    python create_embeddings.py --limit 200
"""

from __future__ import annotations

import argparse
from typing import Optional

from backend_common import (
    DEFAULT_EMBEDDING_MODEL,
    Document,
    chunk_items_by_token_limit,
    compact_text,
    get_logger,
    get_openai_client,
    get_session_factory,
    serialize_embedding,
)


LOGGER = get_logger("create_embeddings")


def create_embeddings(limit: Optional[int] = None) -> None:
    """Generate missing embeddings and write them back to PostgreSQL."""
    session_factory = get_session_factory()
    client = get_openai_client()

    with session_factory() as session:
        query = session.query(Document).filter(Document.embedding.is_(None)).order_by(Document.id.asc())
        if limit:
            query = query.limit(limit)

        documents = [doc for doc in query.all() if compact_text(doc.text)]
        if not documents:
            LOGGER.info("No documents without embeddings were found.")
            return

        LOGGER.info("Embedding %s documents using %s", len(documents), DEFAULT_EMBEDDING_MODEL)
        batched_inputs = [(document, document.text[:8000]) for document in documents]

        for batch in chunk_items_by_token_limit(batched_inputs, max_tokens=2048):
            docs = [item[0] for item in batch]
            texts = [compact_text(item[1]) for item in batch]

            response = client.embeddings.create(
                model=DEFAULT_EMBEDDING_MODEL,
                input=texts,
            )

            for document, embedding_row in zip(docs, response.data):
                document.embedding = serialize_embedding(embedding_row.embedding)

            session.commit()
            LOGGER.info("Stored embeddings for batch of %s documents.", len(docs))


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Generate embeddings for legal documents.")
    parser.add_argument("--limit", type=int, default=None, help="Optional max number of documents to process.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    create_embeddings(limit=args.limit)
