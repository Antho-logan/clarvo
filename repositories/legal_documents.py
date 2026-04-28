"""Persistence helpers for legislation and case-law records."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from sqlalchemy.orm import Session

from backend_common import (
    DEFAULT_EFFECTIVE_FROM,
    DEFAULT_EFFECTIVE_TO,
    Document,
    compact_text,
    get_logger,
    get_parser_version,
    get_session_factory,
    utcnow,
)
from parsers.bwb_parser import LawDocument
from parsers.rechtspraak_parser import JudgmentDocument

LOGGER = get_logger("repositories.legal_documents")


@dataclass
class InsertSummary:
    """Simple insert/update summary returned by repository helpers."""

    inserted: int
    updated: int
    total: int


def _parse_optional_date(value: object) -> date | None:
    """Parse an ISO date string when present."""
    if not value:
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def _upsert_row(
    session: Session,
    *,
    source_id: str,
    domain: str | None,
    article: str | None,
    section: str | None,
    payload: dict[str, Any],
) -> bool:
    """Insert or update a single normalized document row."""
    with session.no_autoflush:
        existing = (
            session.query(Document)
            .filter(Document.source_type == payload["source_type"])
            .filter(Document.source_system == payload["source_system"])
            .filter(Document.source_id == source_id)
            .filter(
                Document.domain.is_(None)
                if domain is None
                else Document.domain == domain
            )
            .filter(
                Document.article.is_(None)
                if article is None
                else Document.article == article
            )
            .filter(
                Document.section.is_(None)
                if section is None
                else Document.section == section
            )
            .one_or_none()
        )

    if existing is None:
        session.add(Document(**payload))
        return True

    for key, value in payload.items():
        setattr(existing, key, value)
    existing.updated_at = utcnow()
    return False


def insert_law_document(
    law_document: LawDocument,
    *,
    domain: str | None = None,
    source_url: str,
    fetched_at: datetime | None = None,
    parser_version: str | None = None,
    fetch_metadata: dict[str, Any] | None = None,
) -> InsertSummary:
    """Insert normalized law rows with idempotent upsert behavior."""
    session_factory = get_session_factory()
    fetched_at = fetched_at or utcnow()
    parser_version = parser_version or get_parser_version()
    effective_from = (
        _parse_optional_date((fetch_metadata or {}).get("selected_start_date"))
        or DEFAULT_EFFECTIVE_FROM
    )
    effective_to = (
        _parse_optional_date((fetch_metadata or {}).get("selected_end_date"))
        or DEFAULT_EFFECTIVE_TO
    )

    inserted = 0
    updated = 0
    normalized_articles: dict[tuple[str | None, str | None], dict[str, str | None]] = {}
    for item in law_document.articles:
        key = (item.article_number, item.section_number)
        existing_item = normalized_articles.get(key)
        if existing_item is None:
            normalized_articles[key] = {
                "article_number": item.article_number,
                "section_number": item.section_number,
                "text": item.text,
                "article_title": item.article_title,
            }
            continue

        merged_parts = [existing_item["text"], item.text]
        unique_parts: list[str] = []
        for part in merged_parts:
            normalized = compact_text(part or "")
            if normalized and normalized not in unique_parts:
                unique_parts.append(normalized)
        existing_item["text"] = compact_text("\n\n".join(unique_parts))
        if not existing_item["article_title"] and item.article_title:
            existing_item["article_title"] = item.article_title

    with session_factory() as session:
        for index, normalized_item in enumerate(normalized_articles.values()):
            payload = {
                "document_type": (
                    "law_article_section"
                    if normalized_item["section_number"]
                    else "law_article"
                ),
                "source_type": law_document.source_type,
                "source_system": law_document.source_system,
                "source_id": law_document.bwbr_id,
                "domain": domain,
                "bwbr_id": law_document.bwbr_id,
                "ecli": None,
                "title": law_document.title,
                "article": normalized_item["article_number"],
                "section": normalized_item["section_number"],
                "court": None,
                "decision_date": None,
                "subject": normalized_item["article_title"],
                "effective_from": effective_from,
                "effective_to": effective_to,
                "text": normalized_item["text"],
                # Preserve the full source XML on one anchor row per source/domain.
                "raw_xml": law_document.raw_xml if index == 0 else None,
                "source_url": source_url,
                "fetched_at": fetched_at,
                "parser_version": parser_version,
                "updated_at": utcnow(),
            }
            if _upsert_row(
                session,
                source_id=law_document.bwbr_id,
                domain=domain,
                article=normalized_item["article_number"],
                section=normalized_item["section_number"],
                payload=payload,
            ):
                inserted += 1
            else:
                updated += 1

        session.commit()

    summary = InsertSummary(
        inserted=inserted, updated=updated, total=len(normalized_articles)
    )
    LOGGER.info(
        "Stored law rows for %s inserted=%s updated=%s",
        law_document.bwbr_id,
        inserted,
        updated,
    )
    return summary


def insert_judgment_document(
    judgment_document: JudgmentDocument,
    *,
    domain: str | None = None,
    source_url: str,
    fetched_at: datetime | None = None,
    parser_version: str | None = None,
) -> InsertSummary:
    """Insert or update one normalized judgment row."""
    session_factory = get_session_factory()
    fetched_at = fetched_at or utcnow()
    parser_version = parser_version or get_parser_version()

    payload = {
        "document_type": "judgment",
        "source_type": judgment_document.source_type,
        "source_system": judgment_document.source_system,
        "source_id": judgment_document.ecli,
        "domain": domain,
        "bwbr_id": None,
        "ecli": judgment_document.ecli,
        "title": judgment_document.ecli,
        "article": None,
        "section": None,
        "court": judgment_document.court,
        "decision_date": judgment_document.decision_date,
        "subject": judgment_document.subject,
        "effective_from": DEFAULT_EFFECTIVE_FROM,
        "effective_to": DEFAULT_EFFECTIVE_TO,
        "text": judgment_document.text,
        "raw_xml": judgment_document.raw_xml,
        "source_url": source_url,
        "fetched_at": fetched_at,
        "parser_version": parser_version,
        "updated_at": utcnow(),
    }

    with session_factory() as session:
        inserted = (
            1
            if _upsert_row(
                session,
                source_id=judgment_document.ecli,
                domain=domain,
                article=None,
                section=None,
                payload=payload,
            )
            else 0
        )
        updated = 0 if inserted else 1
        session.commit()

    summary = InsertSummary(inserted=inserted, updated=updated, total=1)
    LOGGER.info(
        "Stored judgment row for %s inserted=%s updated=%s",
        judgment_document.ecli,
        inserted,
        updated,
    )
    return summary


def get_document_by_source_id(
    source_id: str, *, domain: str | None = None
) -> list[Document]:
    """Return stored rows for one source identifier."""
    session_factory = get_session_factory()
    with session_factory() as session:
        query = session.query(Document).filter(Document.source_id == source_id)
        if domain is not None:
            query = query.filter(Document.domain == domain)
        return query.order_by(
            Document.domain.asc().nullsfirst(),
            Document.article.asc().nullsfirst(),
            Document.section.asc().nullsfirst(),
        ).all()


def list_sample_documents(
    limit: int = 10,
    *,
    source_type: str | None = None,
    domain: str | None = None,
) -> list[Document]:
    """Return a small sample of stored documents."""
    session_factory = get_session_factory()
    with session_factory() as session:
        query = session.query(Document)
        if source_type is not None:
            query = query.filter(Document.source_type == source_type)
        if domain is not None:
            query = query.filter(Document.domain == domain)
        return query.order_by(Document.created_at.desc()).limit(limit).all()


def count_documents_by_source_id(source_id: str, *, domain: str | None = None) -> int:
    """Return the number of stored rows for a source identifier."""
    session_factory = get_session_factory()
    with session_factory() as session:
        query = session.query(Document).filter(Document.source_id == source_id)
        if domain is not None:
            query = query.filter(Document.domain == domain)
        return query.count()
