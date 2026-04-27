"""Tests for repositories/ingestion_jobs.py CRUD helpers."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from repositories.ingestion_jobs import (
    create_job,
    finalize_job,
    get_job_details,
    list_jobs,
    list_retryable_items,
    mark_job_running,
    upsert_job_item,
    upsert_source_registry,
)


@pytest.mark.usefixtures("db_engine")
def test_full_job_lifecycle() -> None:
    job = create_job(
        job_type="curated_laws",
        source_system="bwb",
        domain="employment_law",
        total_items=2,
        notes="initial",
        status="queued",
    )
    assert job.status == "queued"
    assert job.total_items == 2
    assert job.as_dict()["items_total"] == 2

    running = mark_job_running(job.id, total_items=3, notes="running now")
    assert running.status == "running"
    assert running.total_items == 3
    assert running.notes == "running now"

    upsert_job_item(
        job_id=job.id,
        source_type="legislation",
        source_system="bwb",
        source_identifier="BWBR0001",
        domain="employment_law",
        status="success",
        fetched_at=datetime.now(timezone.utc),
        inserted_count=5,
    )
    upsert_job_item(
        job_id=job.id,
        source_type="legislation",
        source_system="bwb",
        source_identifier="BWBR0002",
        domain="employment_law",
        status="failed",
        error_message="HTTP 500",
    )

    details = get_job_details(job.id)
    assert len(details.items) == 2
    statuses = {item.status for item in details.items}
    assert statuses == {"success", "failed"}

    # Re-upserting an item overwrites the earlier fields.
    upsert_job_item(
        job_id=job.id,
        source_type="legislation",
        source_system="bwb",
        source_identifier="BWBR0002",
        domain="employment_law",
        status="success",
        inserted_count=1,
    )
    refreshed = get_job_details(job.id)
    assert {item.status for item in refreshed.items} == {"success"}

    finished = finalize_job(
        job.id,
        status="completed",
        success_count=2,
        failure_count=0,
        notes="done",
    )
    assert finished.status == "completed"
    assert finished.finished_at is not None
    assert finished.notes == "done"
    assert finished.as_dict()["items_done"] == 2
    assert finished.as_dict()["items_failed"] == 0


@pytest.mark.usefixtures("db_engine")
def test_mark_and_finalize_raise_when_job_missing() -> None:
    with pytest.raises(LookupError):
        mark_job_running(12345)
    with pytest.raises(LookupError):
        finalize_job(12345, status="completed", success_count=0, failure_count=0)
    with pytest.raises(LookupError):
        get_job_details(12345)


@pytest.mark.usefixtures("db_engine")
def test_list_jobs_orders_most_recent_first() -> None:
    first = create_job(job_type="curated_laws", source_system="bwb", domain=None, total_items=0)
    second = create_job(job_type="curated_judgments", source_system="rechtspraak", domain=None, total_items=0)
    jobs = list_jobs(limit=5)
    assert [job.id for job in jobs][:2] == [second.id, first.id]


@pytest.mark.usefixtures("db_engine")
def test_list_retryable_items_returns_only_retryable_statuses() -> None:
    job = create_job(job_type="curated_laws", source_system="bwb", domain=None, total_items=0)
    upsert_job_item(
        job_id=job.id,
        source_type="legislation",
        source_system="bwb",
        source_identifier="A",
        domain=None,
        status="success",
    )
    upsert_job_item(
        job_id=job.id,
        source_type="legislation",
        source_system="bwb",
        source_identifier="B",
        domain=None,
        status="failed",
    )
    upsert_job_item(
        job_id=job.id,
        source_type="legislation",
        source_system="bwb",
        source_identifier="C",
        domain=None,
        status="pending",
    )

    retryable = list_retryable_items(job.id)
    identifiers = {item.source_identifier for item in retryable}
    assert identifiers == {"B", "C"}


@pytest.mark.usefixtures("db_engine")
def test_upsert_source_registry_inserts_and_updates() -> None:
    inserted = upsert_source_registry(
        source_system="bwb",
        source_type="legislation",
        identifier="BWBR0001",
        domain="employment_law",
        source_url="https://example/1",
        is_active=True,
        notes="seed",
    )
    assert inserted.source_url == "https://example/1"
    assert inserted.is_active is True

    updated = upsert_source_registry(
        source_system="bwb",
        source_type="legislation",
        identifier="BWBR0001",
        domain="employment_law",
        is_active=False,
        notes="disabled",
    )
    assert updated.id == inserted.id
    assert updated.is_active is False
    assert updated.notes == "disabled"
    assert updated.source_url == "https://example/1"
    assert updated.editorial_priority == 100
