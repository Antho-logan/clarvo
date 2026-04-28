"""Repository helpers for user-scoped matters."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date
from typing import Any, Optional

from sqlalchemy import or_

from backend_common import (
    Matter,
    MatterAgentRun,
    MatterDocument,
    get_session_factory,
    utcnow,
)


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
    parsed_id = uuid.UUID(matter_id)
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


def update_matter(*, user_id: str, matter_id: str, values: dict[str, Any]) -> Matter:
    """Patch allowed matter fields."""
    parsed_id = uuid.UUID(matter_id)
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
        link = MatterDocument(matter_id=matter.id, document_id=uuid.UUID(document_id))
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
