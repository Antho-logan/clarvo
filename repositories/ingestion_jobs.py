"""Repository helpers for ingestion job tracking and audit logging."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from backend_common import (
    IngestionJob,
    IngestionJobItem,
    SourceRegistry,
    get_session_factory,
    utcnow,
)


@dataclass
class IngestionJobDetails:
    """Typed wrapper returned by job detail lookups."""

    job: IngestionJob
    items: list[IngestionJobItem]


def create_job(
    *,
    job_type: str,
    source_system: str,
    domain: str | None,
    total_items: int,
    notes: str | None = None,
) -> IngestionJob:
    """Create a new ingestion job row."""
    session_factory = get_session_factory()
    with session_factory() as session:
        job = IngestionJob(
            job_type=job_type,
            source_system=source_system,
            domain=domain,
            status="running",
            total_items=total_items,
            notes=notes,
        )
        session.add(job)
        session.commit()
        session.refresh(job)
        return job


def finalize_job(job_id: int, *, status: str, success_count: int, failure_count: int, notes: str | None = None) -> IngestionJob:
    """Mark an ingestion job as finished and update counts."""
    session_factory = get_session_factory()
    with session_factory() as session:
        job = session.get(IngestionJob, job_id)
        if job is None:
            raise LookupError(f"Ingestion job {job_id} was not found.")
        job.status = status
        job.success_count = success_count
        job.failure_count = failure_count
        job.finished_at = utcnow()
        if notes is not None:
            job.notes = notes
        job.updated_at = utcnow()
        session.commit()
        session.refresh(job)
        return job


def upsert_job_item(
    *,
    job_id: int,
    source_type: str,
    source_system: str,
    source_identifier: str,
    domain: str | None,
    status: str,
    error_message: str | None = None,
    fetched_at: datetime | None = None,
    inserted_count: int | None = None,
) -> IngestionJobItem:
    """Insert or update one ingestion job item."""
    session_factory = get_session_factory()
    with session_factory() as session:
        item = (
            session.query(IngestionJobItem)
            .filter(IngestionJobItem.job_id == job_id)
            .filter(IngestionJobItem.source_system == source_system)
            .filter(IngestionJobItem.source_type == source_type)
            .filter(IngestionJobItem.source_identifier == source_identifier)
            .filter(IngestionJobItem.domain.is_(None) if domain is None else IngestionJobItem.domain == domain)
            .one_or_none()
        )
        if item is None:
            item = IngestionJobItem(
                job_id=job_id,
                source_type=source_type,
                source_system=source_system,
                source_identifier=source_identifier,
                domain=domain,
                status=status,
                error_message=error_message,
                fetched_at=fetched_at,
                inserted_count=inserted_count,
            )
            session.add(item)
        else:
            item.status = status
            item.error_message = error_message
            item.fetched_at = fetched_at
            item.inserted_count = inserted_count
            item.updated_at = utcnow()

        session.commit()
        session.refresh(item)
        return item


def list_jobs(limit: int = 20) -> list[IngestionJob]:
    """Return recent ingestion jobs."""
    session_factory = get_session_factory()
    with session_factory() as session:
        return session.query(IngestionJob).order_by(IngestionJob.created_at.desc()).limit(limit).all()


def get_job_details(job_id: int) -> IngestionJobDetails:
    """Return one ingestion job and all of its items."""
    session_factory = get_session_factory()
    with session_factory() as session:
        job = session.get(IngestionJob, job_id)
        if job is None:
            raise LookupError(f"Ingestion job {job_id} was not found.")
        items = (
            session.query(IngestionJobItem)
            .filter(IngestionJobItem.job_id == job_id)
            .order_by(IngestionJobItem.created_at.asc(), IngestionJobItem.id.asc())
            .all()
        )
        return IngestionJobDetails(job=job, items=items)


def list_retryable_items(job_id: int) -> list[IngestionJobItem]:
    """Return items from a previous job that are safe to retry."""
    retryable_statuses = ("pending", "running", "failed")
    session_factory = get_session_factory()
    with session_factory() as session:
        return (
            session.query(IngestionJobItem)
            .filter(IngestionJobItem.job_id == job_id)
            .filter(IngestionJobItem.status.in_(retryable_statuses))
            .order_by(IngestionJobItem.created_at.asc(), IngestionJobItem.id.asc())
            .all()
        )


def upsert_source_registry(
    *,
    source_system: str,
    source_type: str,
    identifier: str,
    domain: str | None,
    source_url: str | None = None,
    is_active: bool = True,
    notes: str | None = None,
) -> SourceRegistry:
    """Insert or update a curated source registry row."""
    session_factory = get_session_factory()
    with session_factory() as session:
        registry = (
            session.query(SourceRegistry)
            .filter(SourceRegistry.source_system == source_system)
            .filter(SourceRegistry.source_type == source_type)
            .filter(SourceRegistry.identifier == identifier)
            .filter(SourceRegistry.domain.is_(None) if domain is None else SourceRegistry.domain == domain)
            .one_or_none()
        )
        if registry is None:
            registry = SourceRegistry(
                source_system=source_system,
                source_type=source_type,
                identifier=identifier,
                domain=domain,
                source_url=source_url,
                is_active=is_active,
                notes=notes,
            )
            session.add(registry)
        else:
            registry.source_url = source_url or registry.source_url
            registry.is_active = is_active
            registry.notes = notes if notes is not None else registry.notes
            registry.updated_at = utcnow()
        session.commit()
        session.refresh(registry)
        return registry
