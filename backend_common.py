"""
Shared backend utilities for the legal AI platform.

This module centralizes:
1. Environment-based configuration.
2. SQLAlchemy model definitions.
3. Database session helpers.
4. Common text, time, and embedding helpers used across scripts.
"""

from __future__ import annotations

import json
import logging
import os
import re
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Iterable, Iterator, Optional, Sequence

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Text, create_engine
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker


DEFAULT_EFFECTIVE_FROM = date(1900, 1, 1)
DEFAULT_EFFECTIVE_TO = date(9999, 12, 31)
DEFAULT_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
DEFAULT_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4.1")
DEFAULT_SOURCE_PATH = os.getenv("SOURCE_PATH") or os.getenv("WETTEN_XML_SOURCE_PATH", "./wetten_xml")
DEFAULT_HTTP_TIMEOUT_SECONDS = float(os.getenv("HTTP_TIMEOUT_SECONDS", "30"))
DEFAULT_USER_AGENT = os.getenv("USER_AGENT", "veridicta-milestone1/1.0")
DEFAULT_PARSER_VERSION = os.getenv("PARSER_VERSION", "milestone1-v1")
DEFAULT_BWB_BASE_URL = os.getenv("BWB_BASE_URL", "https://repository.officiele-overheidspublicaties.nl/BWB")
DEFAULT_RECHTSPRAAK_BASE_URL = os.getenv(
    "RECHTSPRAAK_BASE_URL",
    "https://data.rechtspraak.nl/uitspraken/content",
)
REPO_ROOT = Path(__file__).resolve().parent


class Base(DeclarativeBase):
    """Base SQLAlchemy declarative model."""


class Document(Base):
    """
    Canonical legal document chunk stored in PostgreSQL.

    The schema preserves the original scaffold fields and adds the
    source-specific persistence fields required for milestone 1.
    """

    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_type: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    source_system: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    source_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    domain: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    bwbr_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    ecli: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    article: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    section: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    court: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decision_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False, default=DEFAULT_EFFECTIVE_FROM)
    effective_to: Mapped[date] = mapped_column(Date, nullable=False, default=DEFAULT_EFFECTIVE_TO)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    raw_xml: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fetched_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    parser_version: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    embedding: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: utcnow(),
        onupdate=lambda: utcnow(),
    )

    def as_dict(self) -> dict:
        """Serialize the document into a JSON-friendly dictionary."""
        return {
            "id": str(self.id),
            "document_type": self.document_type,
            "source_type": self.source_type,
            "source_system": self.source_system,
            "source_id": self.source_id,
            "domain": self.domain,
            "bwbr_id": self.bwbr_id,
            "ecli": self.ecli,
            "title": self.title,
            "article": self.article,
            "section": self.section,
            "court": self.court,
            "decision_date": self.decision_date.isoformat() if self.decision_date else None,
            "subject": self.subject,
            "effective_from": self.effective_from.isoformat(),
            "effective_to": self.effective_to.isoformat(),
            "text": self.text,
            "source_url": self.source_url,
            "fetched_at": self.fetched_at.isoformat() if self.fetched_at else None,
            "parser_version": self.parser_version,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


@dataclass
class SearchHit:
    """Simple search result container returned by the retrieval layer."""

    id: str
    document_type: str
    source_type: Optional[str]
    source_id: Optional[str]
    domain: Optional[str]
    bwbr_id: Optional[str]
    ecli: Optional[str]
    article: Optional[str]
    section: Optional[str]
    title: Optional[str]
    text: str
    source_url: Optional[str]
    score: float
    source: str

    def as_dict(self) -> dict:
        """Serialize the hit to a dictionary."""
        return {
            "id": self.id,
            "document_type": self.document_type,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "domain": self.domain,
            "bwbr_id": self.bwbr_id,
            "ecli": self.ecli,
            "article": self.article,
            "section": self.section,
            "title": self.title,
            "text": self.text,
            "source_url": self.source_url,
            "score": self.score,
            "source": self.source,
        }


class IngestionJob(Base):
    """Top-level ingestion run record for curated fetch and parse jobs."""

    __tablename__ = "ingestion_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    source_system: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    domain: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: utcnow())
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_items: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    success_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failure_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: utcnow(),
        onupdate=lambda: utcnow(),
    )

    items: Mapped[list["IngestionJobItem"]] = relationship(back_populates="job")

    def as_dict(self) -> dict:
        """Serialize the ingestion job into a JSON-friendly dictionary."""
        return {
            "id": self.id,
            "job_type": self.job_type,
            "source_system": self.source_system,
            "domain": self.domain,
            "status": self.status,
            "started_at": self.started_at.isoformat(),
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "total_items": self.total_items,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "notes": self.notes,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class IngestionJobItem(Base):
    """Per-source ingest attempt status for auditability and resume support."""

    __tablename__ = "ingestion_job_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("ingestion_jobs.id"), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    source_system: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    source_identifier: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    domain: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fetched_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    inserted_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: utcnow(),
        onupdate=lambda: utcnow(),
    )

    job: Mapped[IngestionJob] = relationship(back_populates="items")

    def as_dict(self) -> dict:
        """Serialize the job item into a JSON-friendly dictionary."""
        return {
            "id": self.id,
            "job_id": self.job_id,
            "source_type": self.source_type,
            "source_system": self.source_system,
            "source_identifier": self.source_identifier,
            "domain": self.domain,
            "status": self.status,
            "error_message": self.error_message,
            "fetched_at": self.fetched_at.isoformat() if self.fetched_at else None,
            "inserted_count": self.inserted_count,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class SourceRegistry(Base):
    """Curated source registry used for auditability and ingestion seed tracking."""

    __tablename__ = "source_registry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_system: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    identifier: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    source_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    domain: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: utcnow(),
        onupdate=lambda: utcnow(),
    )

    def as_dict(self) -> dict:
        """Serialize the source registry row into a JSON-friendly dictionary."""
        return {
            "id": self.id,
            "source_system": self.source_system,
            "source_type": self.source_type,
            "identifier": self.identifier,
            "source_url": self.source_url,
            "domain": self.domain,
            "is_active": self.is_active,
            "notes": self.notes,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


def get_logger(name: str) -> logging.Logger:
    """Create or return a module logger with a predictable text format."""
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    return logging.getLogger(name)


def require_env(name: str, default: Optional[str] = None) -> str:
    """Read an environment variable and fail fast when it is missing."""
    value = os.getenv(name, default)
    if not value:
        raise RuntimeError(f"Environment variable {name} is required.")
    return value


def get_database_url() -> str:
    """Return the configured PostgreSQL connection string."""
    return require_env("DATABASE_URL")


def get_engine(echo: bool = False):
    """Create a SQLAlchemy engine using the configured PostgreSQL URL."""
    return create_engine(get_database_url(), echo=echo, future=True)


def get_session_factory(echo: bool = False) -> sessionmaker[Session]:
    """Return a reusable SQLAlchemy session factory."""
    return sessionmaker(bind=get_engine(echo=echo), expire_on_commit=False, class_=Session)


def get_openai_client():
    """
    Return an OpenAI client instance.

    The import is done lazily so syntax checks still work even if the package
    is not installed in the current Python environment yet.
    """

    from openai import OpenAI  # Imported lazily by design.

    return OpenAI(api_key=require_env("OPENAI_API_KEY"))


def get_http_timeout_seconds() -> float:
    """Return the configured outbound HTTP timeout."""
    return DEFAULT_HTTP_TIMEOUT_SECONDS


def get_user_agent() -> str:
    """Return the configured HTTP user agent."""
    return DEFAULT_USER_AGENT


def get_parser_version() -> str:
    """Return the parser version stored with persisted rows."""
    return DEFAULT_PARSER_VERSION


def get_bwb_base_url() -> str:
    """Return the configured BWB base URL."""
    return DEFAULT_BWB_BASE_URL.rstrip("/")


def get_rechtspraak_base_url() -> str:
    """Return the configured Rechtspraak base URL."""
    return DEFAULT_RECHTSPRAAK_BASE_URL


def get_repo_root() -> Path:
    """Return the repository root for config and docs lookups."""
    return REPO_ROOT


def utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


def estimate_tokens(text: str) -> int:
    """
    Rough token estimate used for batching embeddings.

    A simple and stable heuristic is sufficient here:
    ~1 token ~= 4 characters for mixed European-language text.
    """
    return max(1, len(text) // 4)


def chunk_items_by_token_limit(
    items: Sequence[tuple[object, str]],
    max_tokens: int = 2048,
) -> Iterator[list[tuple[object, str]]]:
    """
    Yield batches whose total estimated token count stays within `max_tokens`.

    Each item is a tuple `(payload, text_for_token_estimation)`.
    """
    batch: list[tuple[object, str]] = []
    token_total = 0

    for item in items:
        item_tokens = estimate_tokens(item[1])
        if batch and token_total + item_tokens > max_tokens:
            yield batch
            batch = []
            token_total = 0

        batch.append(item)
        token_total += item_tokens

    if batch:
        yield batch


def normalize_scores(score_map: dict[str, float]) -> dict[str, float]:
    """
    Normalize a mapping of scores to the [0, 1] range.

    When all scores are equal, every document receives 1.0.
    """
    if not score_map:
        return {}

    values = list(score_map.values())
    min_score = min(values)
    max_score = max(values)
    if max_score == min_score:
        return {key: 1.0 for key in score_map}

    return {
        key: (value - min_score) / (max_score - min_score)
        for key, value in score_map.items()
    }


def compact_text(text: str) -> str:
    """Normalize whitespace and strip surrounding spaces."""
    return re.sub(r"\s+", " ", text or "").strip()


def serialize_embedding(embedding: Sequence[float]) -> str:
    """Serialize an embedding list into JSON for PostgreSQL storage."""
    return json.dumps(list(embedding))


def deserialize_embedding(value: object) -> Optional[list[float]]:
    """Parse a stored embedding JSON payload back into a float list."""
    if value is None:
        return None
    if isinstance(value, list):
        return [float(item) for item in value]
    if isinstance(value, tuple):
        return [float(item) for item in value]
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            if text.startswith("{") and text.endswith("}"):
                parts = [part for part in text.strip("{}").split(",") if part]
                return [float(part) for part in parts]
            raise
        return [float(item) for item in parsed]
    raise TypeError(f"Unsupported embedding payload type: {type(value)!r}")


def cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
    """Compute cosine similarity for two vectors."""
    if len(left) != len(right):
        raise ValueError("Embedding vectors must have equal length.")
    dot_product = sum(a * b for a, b in zip(left, right))
    left_norm = sum(a * a for a in left) ** 0.5
    right_norm = sum(b * b for b in right) ** 0.5
    if not left_norm or not right_norm:
        return 0.0
    return dot_product / (left_norm * right_norm)


def extract_json_from_text(text: str) -> dict:
    """
    Best-effort JSON extraction helper for model responses.

    This is useful when a model returns JSON inside prose or fenced code.
    """
    text = text.strip()
    if not text:
        return {}

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    fenced_match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fenced_match:
        return json.loads(fenced_match.group(1))

    brace_match = re.search(r"(\{.*\})", text, re.DOTALL)
    if brace_match:
        return json.loads(brace_match.group(1))

    raise ValueError("Could not extract JSON from model output.")


def load_documents_by_ids(session: Session, document_ids: Iterable[str]) -> list[Document]:
    """Fetch documents by UUID string values."""
    parsed_ids = [uuid.UUID(value) for value in document_ids]
    return session.query(Document).filter(Document.id.in_(parsed_ids)).all()
