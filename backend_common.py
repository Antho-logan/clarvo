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
from typing import Any, Iterable, Iterator, Optional, Sequence

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Text, create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker
from pgvector.sqlalchemy import Vector  # type: ignore[import-untyped]


REPO_ROOT = Path(__file__).resolve().parent


def load_local_env(path: Path | None = None) -> None:
    """Load simple KEY=VALUE pairs from .env.local without overriding env."""
    env_path = path or REPO_ROOT / ".env.local"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'\"")
        if key and key not in os.environ:
            os.environ[key] = value


load_local_env()


DEFAULT_EFFECTIVE_FROM = date(1900, 1, 1)
DEFAULT_EFFECTIVE_TO = date(9999, 12, 31)
DEFAULT_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
DEFAULT_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4.1")
DEFAULT_SOURCE_PATH = os.getenv("SOURCE_PATH") or os.getenv("WETTEN_XML_SOURCE_PATH", "./wetten_xml")
DEFAULT_HTTP_TIMEOUT_SECONDS = float(os.getenv("HTTP_TIMEOUT_SECONDS", "30"))
DEFAULT_USER_AGENT = os.getenv("USER_AGENT", "clarvo-milestone1/1.0")
DEFAULT_PARSER_VERSION = os.getenv("PARSER_VERSION", "milestone1-v1")
EMBEDDING_DIMENSIONS = 1536
DEFAULT_EMBEDDING_VERSION = os.getenv("EMBEDDING_SCHEMA_VERSION", "v1")
EMBEDDING_STATUS_PENDING = "pending"
EMBEDDING_STATUS_COMPLETED = "completed"
EMBEDDING_STATUS_FAILED = "failed"
EMBEDDING_STATUS_STALE = "stale"
EMBEDDING_STATUS_SKIPPED = "skipped"
DEFAULT_BWB_BASE_URL = os.getenv("BWB_BASE_URL", "https://repository.officiele-overheidspublicaties.nl/BWB")
DEFAULT_RECHTSPRAAK_BASE_URL = os.getenv(
    "RECHTSPRAAK_BASE_URL",
    "https://data.rechtspraak.nl/uitspraken/content",
)


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
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(EMBEDDING_DIMENSIONS), nullable=True)
    embedding_model: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    embedding_dimensions: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    embedding_version: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    embedded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    embedding_status: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default=EMBEDDING_STATUS_PENDING,
        index=True,
    )
    embedding_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    embedding_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    embedding_source_hash: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    last_embedding_job_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: utcnow(),
        onupdate=lambda: utcnow(),
    )

    def as_dict(self) -> dict[str, Any]:
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
            "embedding_model": self.embedding_model,
            "embedding_dimensions": self.embedding_dimensions,
            "embedding_version": self.embedding_version,
            "embedded_at": self.embedded_at.isoformat() if self.embedded_at else None,
            "embedding_status": self.embedding_status,
            "embedding_error": self.embedding_error,
            "embedding_attempts": self.embedding_attempts,
            "embedding_source_hash": self.embedding_source_hash,
            "last_embedding_job_id": self.last_embedding_job_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


@dataclass
class SearchHit:
    """Simple search result container returned by the retrieval layer."""

    id: str
    document_type: str
    source_type: Optional[str]
    source_system: Optional[str]
    source_id: Optional[str]
    domain: Optional[str]
    bwbr_id: Optional[str]
    ecli: Optional[str]
    article: Optional[str]
    section: Optional[str]
    title: Optional[str]
    court: Optional[str]
    decision_date: Optional[date]
    subject: Optional[str]
    text: str
    source_url: Optional[str]
    embedding_status: Optional[str]
    score: float
    source: str

    def as_dict(self) -> dict[str, Any]:
        """Serialize the hit to a dictionary."""
        return {
            "id": self.id,
            "document_type": self.document_type,
            "source_type": self.source_type,
            "source_system": self.source_system,
            "source_id": self.source_id,
            "domain": self.domain,
            "bwbr_id": self.bwbr_id,
            "ecli": self.ecli,
            "article": self.article,
            "section": self.section,
            "title": self.title,
            "court": self.court,
            "decision_date": self.decision_date.isoformat() if self.decision_date else None,
            "subject": self.subject,
            "text": self.text,
            "source_url": self.source_url,
            "embedding_status": self.embedding_status,
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

    def as_dict(self) -> dict[str, Any]:
        """Serialize the ingestion job into a JSON-friendly dictionary."""
        items_done = self.success_count + self.failure_count
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
            "items_total": self.total_items,
            "items_done": items_done,
            "items_failed": self.failure_count,
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
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: utcnow(),
        onupdate=lambda: utcnow(),
    )

    job: Mapped[IngestionJob] = relationship(back_populates="items")

    def as_dict(self) -> dict[str, Any]:
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
            "retry_count": self.retry_count,
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
    editorial_priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: utcnow(),
        onupdate=lambda: utcnow(),
    )

    def as_dict(self) -> dict[str, Any]:
        """Serialize the source registry row into a JSON-friendly dictionary."""
        return {
            "id": self.id,
            "source_system": self.source_system,
            "source_type": self.source_type,
            "identifier": self.identifier,
            "source_url": self.source_url,
            "domain": self.domain,
            "is_active": self.is_active,
            "editorial_priority": self.editorial_priority,
            "notes": self.notes,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class User(Base):
    """Auth.js user row shared by the Next.js app and API ownership checks."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(Text, nullable=True, unique=True, index=True)
    emailVerified: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    image: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: utcnow(),
        onupdate=lambda: utcnow(),
    )


class Account(Base):
    """Auth.js linked provider account."""

    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    userId: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    providerAccountId: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expires_at: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    token_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scope: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    id_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    session_state: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class AuthSession(Base):
    """Auth.js browser session."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sessionToken: Mapped[str] = mapped_column(Text, nullable=False, unique=True, index=True)
    userId: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    expires: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class VerificationToken(Base):
    """Auth.js email magic-link token."""

    __tablename__ = "verification_token"

    identifier: Mapped[str] = mapped_column(Text, primary_key=True)
    token: Mapped[str] = mapped_column(Text, primary_key=True)
    expires: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Matter(Base):
    """User-scoped legal matter workspace."""

    __tablename__ = "matter"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    client: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active", index=True)
    opened_at: Mapped[date] = mapped_column(Date, nullable=False, default=lambda: utcnow().date())
    closed_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    rechtsgebied: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: utcnow(),
        onupdate=lambda: utcnow(),
    )

    def as_dict(self) -> dict[str, Any]:
        """Serialize a matter to JSON."""
        return {
            "id": str(self.id),
            "user_id": self.user_id,
            "title": self.title,
            "client": self.client,
            "status": self.status,
            "opened_at": self.opened_at.isoformat(),
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
            "rechtsgebied": self.rechtsgebied,
            "description": self.description,
            "tags": self.tags or {},
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class MatterDocument(Base):
    """Link table between matters and source documents."""

    __tablename__ = "matter_documents"

    matter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("matter.id"), primary_key=True)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: utcnow())


class MatterAgentRun(Base):
    """Link table between matters and agent/workflow run identifiers."""

    __tablename__ = "matter_agent_runs"

    matter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("matter.id"), primary_key=True)
    run_id: Mapped[str] = mapped_column(Text, primary_key=True)
    run_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: utcnow())


class UserSettings(Base):
    """User-scoped settings persisted from the dashboard settings page."""

    __tablename__ = "user_settings"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    display_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    firm_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    theme_preference: Mapped[str] = mapped_column(Text, nullable=False, default="system")
    bwb_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    rechtspraak_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    openai_key_configured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    cohere_key_configured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    primary_domain: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: utcnow(),
        onupdate=lambda: utcnow(),
    )

    def as_dict(self) -> dict[str, Any]:
        """Serialize settings to JSON without exposing secret values."""
        return {
            "user_id": self.user_id,
            "display_name": self.display_name,
            "firm_name": self.firm_name,
            "theme_preference": self.theme_preference,
            "bwb_enabled": self.bwb_enabled,
            "rechtspraak_enabled": self.rechtspraak_enabled,
            "openai_key_configured": self.openai_key_configured,
            "cohere_key_configured": self.cohere_key_configured,
            "primary_domain": self.primary_domain,
            "onboarding_completed": self.onboarding_completed,
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


def get_engine(echo: bool = False) -> Engine:
    """Create a SQLAlchemy engine using the configured PostgreSQL URL."""
    return create_engine(get_database_url(), echo=echo, future=True)


def get_session_factory(echo: bool = False) -> sessionmaker[Session]:
    """Return a reusable SQLAlchemy session factory."""
    return sessionmaker(bind=get_engine(echo=echo), expire_on_commit=False, class_=Session)


def get_openai_client() -> Any:
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


def validate_embedding_dimensions(
    embedding: Sequence[float],
    *,
    expected_dimensions: int = EMBEDDING_DIMENSIONS,
) -> list[float]:
    """Return an embedding as floats after validating the pgvector column width."""
    values = [float(item) for item in embedding]
    if len(values) != expected_dimensions:
        raise ValueError(
            f"Embedding has {len(values)} dimensions; expected {expected_dimensions} "
            f"for documents.embedding."
        )
    return values


def cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
    """Compute cosine similarity for two vectors."""
    if len(left) != len(right):
        raise ValueError("Embedding vectors must have equal length.")
    dot_product = float(sum(a * b for a, b in zip(left, right)))
    left_norm = float(sum(a * a for a in left)) ** 0.5
    right_norm = float(sum(b * b for b in right)) ** 0.5
    if not left_norm or not right_norm:
        return 0.0
    return float(dot_product / (left_norm * right_norm))


def extract_json_from_text(text: str) -> dict[str, Any]:
    """
    Best-effort JSON extraction helper for model responses.

    This is useful when a model returns JSON inside prose or fenced code.
    """
    text = text.strip()
    if not text:
        return {}

    try:
        parsed: Any = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        pass

    fenced_match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fenced_match:
        parsed = json.loads(fenced_match.group(1))
        return parsed if isinstance(parsed, dict) else {}

    brace_match = re.search(r"(\{.*\})", text, re.DOTALL)
    if brace_match:
        parsed = json.loads(brace_match.group(1))
        return parsed if isinstance(parsed, dict) else {}

    raise ValueError("Could not extract JSON from model output.")


def load_documents_by_ids(session: Session, document_ids: Iterable[str]) -> list[Document]:
    """Fetch documents by UUID string values."""
    parsed_ids = [uuid.UUID(value) for value in document_ids]
    return session.query(Document).filter(Document.id.in_(parsed_ids)).all()
