"""Repository helpers for user-scoped matters."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date
from typing import Any, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend_common import (
    Matter,
    MatterAgentRun,
    MatterDocument,
    User,
    get_session_factory,
    utcnow,
)

DEFAULT_RESEARCH_MATTER_TITLE = "Demo Matter"


def _parse_uuid(value: str, field_name: str) -> uuid.UUID:
    """Parse a UUID input and raise a user-facing validation error."""
    try:
        return uuid.UUID(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be a valid UUID.") from exc


@dataclass(frozen=True)
class MatterInput:
    """Validated matter fields accepted by repository writes."""

    title: str
    client: Optional[str] = None
    status: str = "active"
    opened_at: Optional[date] = None
    closed_at: Optional[date] = None
    rechtsgebied: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[dict[str, Any]] = None


@dataclass(frozen=True)
class ResearchNoteInput:
    """Validated assistant research note fields accepted by matter writes."""

    question: str
    answer: str
    status: str
    citations: list[dict[str, Any]]
    source_ids: list[str]
    domains: list[str]
    matter_id: Optional[str] = None


@dataclass(frozen=True)
class ResearchMemoInput:
    """Validated saved-note reference accepted by memo draft writes."""

    matter_id: str
    source_note_id: str


def _ensure_user_row(session: Session, user_id: str) -> None:
    """Create a minimal user row for API-issued identities when needed."""
    if session.get(User, user_id) is None:
        session.add(User(id=user_id))


def list_matters(
    *,
    user_id: str,
    query: Optional[str] = None,
    status: Optional[str] = None,
    rechtsgebied: Optional[str] = None,
    limit: int = 50,
) -> list[Matter]:
    """Return matters owned by one user."""
    session_factory = get_session_factory()
    with session_factory() as session:
        statement = session.query(Matter).filter(Matter.user_id == user_id)
        if query:
            like = f"%{query}%"
            statement = statement.filter(
                or_(Matter.title.ilike(like), Matter.client.ilike(like))
            )
        if status:
            statement = statement.filter(Matter.status == status)
        if rechtsgebied:
            statement = statement.filter(Matter.rechtsgebied == rechtsgebied)
        return statement.order_by(Matter.updated_at.desc()).limit(limit).all()


def get_matter(*, user_id: str, matter_id: str) -> Matter:
    """Return one matter by id and owner."""
    parsed_id = _parse_uuid(matter_id, "matter_id")
    session_factory = get_session_factory()
    with session_factory() as session:
        matter = (
            session.query(Matter)
            .filter(Matter.user_id == user_id, Matter.id == parsed_id)
            .one_or_none()
        )
        if matter is None:
            raise LookupError(f"Matter {matter_id} was not found.")
        return matter


def create_matter(*, user_id: str, values: MatterInput) -> Matter:
    """Create a new matter for one user."""
    session_factory = get_session_factory()
    with session_factory() as session:
        _ensure_user_row(session, user_id)
        matter = Matter(
            user_id=user_id,
            title=values.title,
            client=values.client,
            status=values.status,
            opened_at=values.opened_at or utcnow().date(),
            closed_at=values.closed_at,
            rechtsgebied=values.rechtsgebied,
            description=values.description,
            tags=values.tags or {},
        )
        session.add(matter)
        session.commit()
        session.refresh(matter)
        return matter


def save_research_note(
    *, user_id: str, values: ResearchNoteInput
) -> tuple[Matter, dict[str, Any]]:
    """Persist a grounded assistant research note on a user matter."""
    if values.status != "grounded":
        raise ValueError("Only grounded assistant answers can be saved to a matter.")
    if not values.question.strip():
        raise ValueError("Research note question is required.")
    if not values.answer.strip():
        raise ValueError("Research note answer is required.")
    if not values.citations:
        raise ValueError("Grounded research notes require at least one citation.")

    parsed_matter_id = (
        _parse_uuid(values.matter_id, "matter_id") if values.matter_id else None
    )
    created_at = utcnow().isoformat()
    note_id = str(uuid.uuid4())

    session_factory = get_session_factory()
    with session_factory() as session:
        _ensure_user_row(session, user_id)

        if parsed_matter_id:
            matter = (
                session.query(Matter)
                .filter(Matter.user_id == user_id, Matter.id == parsed_matter_id)
                .one_or_none()
            )
            if matter is None:
                raise LookupError(f"Matter {values.matter_id} was not found.")
        else:
            matter = (
                session.query(Matter)
                .filter(
                    Matter.user_id == user_id,
                    Matter.title == DEFAULT_RESEARCH_MATTER_TITLE,
                    Matter.status != "archived",
                )
                .order_by(Matter.created_at.asc())
                .first()
            )
            if matter is None:
                matter = Matter(
                    user_id=user_id,
                    title=DEFAULT_RESEARCH_MATTER_TITLE,
                    client="Veridicta demo",
                    status="active",
                    opened_at=utcnow().date(),
                    rechtsgebied=values.domains[0] if values.domains else None,
                    description="Saved assistant research notes.",
                    tags={},
                )
                session.add(matter)
                session.flush()

        note = {
            "id": note_id,
            "type": "assistant_research_note",
            "matter_id": str(matter.id),
            "matter_title": matter.title,
            "question": values.question.strip(),
            "answer": values.answer.strip(),
            "status": values.status,
            "source_ids": values.source_ids,
            "citations": values.citations,
            "citation_count": len(values.citations),
            "domains": values.domains,
            "created_at": created_at,
        }
        tags = dict(matter.tags or {})
        research_notes = list(tags.get("research_notes") or [])
        research_notes.insert(0, note)
        tags["research_notes"] = research_notes
        matter.tags = tags
        matter.updated_at = utcnow()
        session.commit()
        session.refresh(matter)
        return matter, note


MEMO_BLOCK_MESSAGE = (
    "Memo generation is only available for grounded research notes with citations."
)


def _is_memo_source_note(note: Any, source_note_id: str) -> bool:
    return (
        isinstance(note, dict)
        and note.get("id") == source_note_id
        and note.get("type") == "assistant_research_note"
    )


def _validate_memo_source_note(note: dict[str, Any]) -> list[dict[str, Any]]:
    citations = note.get("citations")
    citation_count = note.get("citation_count")
    if (
        note.get("status") != "grounded"
        or not isinstance(citations, list)
        or not isinstance(citation_count, int)
        or citation_count <= 0
        or len(citations) == 0
    ):
        raise ValueError(MEMO_BLOCK_MESSAGE)
    return citations


def _format_memo_citation(citation: dict[str, Any]) -> str:
    parts = [
        citation.get("source_id"),
        f"Art. {citation.get('article')}" if citation.get("article") else None,
        citation.get("court"),
        citation.get("title"),
    ]
    return " · ".join(str(part) for part in parts if part) or "Saved source"


def _build_research_memo_body(
    *, question: str, answer: str, citations: list[dict[str, Any]]
) -> str:
    citation_lines = "\n".join(
        f"- {_format_memo_citation(citation)}" for citation in citations
    )
    return (
        "Research question\n"
        f"{question.strip()}\n\n"
        "Draft memo\n"
        f"{answer.strip()}\n\n"
        "Citation trail\n"
        f"{citation_lines}\n\n"
        "Lawyer review required before use."
    )


def create_research_memo(
    *, user_id: str, values: ResearchMemoInput
) -> tuple[Matter, dict[str, Any]]:
    """Draft a native research memo from a grounded saved research note."""
    parsed_matter_id = _parse_uuid(values.matter_id, "matter_id")
    created_at = utcnow().isoformat()

    session_factory = get_session_factory()
    with session_factory() as session:
        matter = (
            session.query(Matter)
            .filter(Matter.user_id == user_id, Matter.id == parsed_matter_id)
            .one_or_none()
        )
        if matter is None:
            raise LookupError(f"Matter {values.matter_id} was not found.")

        tags = dict(matter.tags or {})
        research_notes = tags.get("research_notes")
        if not isinstance(research_notes, list):
            raise ValueError(MEMO_BLOCK_MESSAGE)

        source_note = next(
            (
                note
                for note in research_notes
                if _is_memo_source_note(note, values.source_note_id)
            ),
            None,
        )
        if source_note is None:
            raise ValueError(MEMO_BLOCK_MESSAGE)

        citations = _validate_memo_source_note(source_note)
        question = str(source_note.get("question") or "").strip()
        answer = str(source_note.get("answer") or "").strip()
        if not question or not answer:
            raise ValueError(MEMO_BLOCK_MESSAGE)

        memo = {
            "id": str(uuid.uuid4()),
            "type": "research_memo",
            "source_note_id": values.source_note_id,
            "question": question,
            "memo_body": _build_research_memo_body(
                question=question,
                answer=answer,
                citations=citations,
            ),
            "citations": citations,
            "citation_count": len(citations),
            "created_at": created_at,
            "status": "draft",
            "lawyer_review_required": True,
            "audit": {
                "generated_from": "saved_research_note",
                "source_note_id": values.source_note_id,
                "generator": "veridicta_native_mvp",
            },
        }
        research_memos = list(tags.get("research_memos") or [])
        research_memos.insert(0, memo)
        tags["research_memos"] = research_memos
        matter.tags = tags
        matter.updated_at = utcnow()
        session.commit()
        session.refresh(matter)
        return matter, memo


def update_matter(*, user_id: str, matter_id: str, values: dict[str, Any]) -> Matter:
    """Patch allowed matter fields."""
    parsed_id = _parse_uuid(matter_id, "matter_id")
    allowed_fields = {
        "title",
        "client",
        "status",
        "opened_at",
        "closed_at",
        "rechtsgebied",
        "description",
        "tags",
    }
    session_factory = get_session_factory()
    with session_factory() as session:
        matter = (
            session.query(Matter)
            .filter(Matter.user_id == user_id, Matter.id == parsed_id)
            .one_or_none()
        )
        if matter is None:
            raise LookupError(f"Matter {matter_id} was not found.")
        for key, value in values.items():
            if key in allowed_fields and value is not None:
                setattr(matter, key, value)
        matter.updated_at = utcnow()
        session.commit()
        session.refresh(matter)
        return matter


def delete_matter(*, user_id: str, matter_id: str) -> None:
    """Archive one matter by marking it closed."""
    update_matter(
        user_id=user_id,
        matter_id=matter_id,
        values={"status": "archived", "closed_at": utcnow().date()},
    )


def link_document(*, user_id: str, matter_id: str, document_id: str) -> None:
    """Link a stored document UUID to a matter."""
    matter = get_matter(user_id=user_id, matter_id=matter_id)
    session_factory = get_session_factory()
    with session_factory() as session:
        link = MatterDocument(
            matter_id=matter.id,
            document_id=_parse_uuid(document_id, "document_id"),
        )
        session.merge(link)
        session.commit()


def link_run(
    *, user_id: str, matter_id: str, run_id: str, run_type: Optional[str] = None
) -> None:
    """Link an agent or workflow run id to a matter."""
    matter = get_matter(user_id=user_id, matter_id=matter_id)
    session_factory = get_session_factory()
    with session_factory() as session:
        link = MatterAgentRun(matter_id=matter.id, run_id=run_id, run_type=run_type)
        session.merge(link)
        session.commit()
