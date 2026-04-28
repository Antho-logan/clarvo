"""Background ingestion tasks."""

from __future__ import annotations

from create_embeddings import create_embeddings
from ingestion.celery_app import celery_app
from ingestion.curated_ingestion import run_curated_judgment_ingestion, run_curated_law_ingestion
from repositories.ingestion_jobs import finalize_job


def _mark_failed(job_id: int, exc: Exception) -> None:
    try:
        finalize_job(
            job_id,
            status="failed",
            success_count=0,
            failure_count=1,
            notes=f"task failed before completion: {exc}",
        )
    except LookupError:
        return


@celery_app.task(name="ingestion.curated_law", autoretry_for=(Exception,), retry_backoff=True, retry_jitter=True, max_retries=3)
def curated_law_task(job_id: int, domain: str | None, limit: int | None, dry_run: bool, resume_job_id: int | None) -> dict:
    try:
        result = run_curated_law_ingestion(
            domain=domain,
            limit=limit,
            dry_run=dry_run,
            resume_job_id=resume_job_id,
            queued_job_id=job_id,
        )
        return result.as_dict()
    except Exception as exc:
        _mark_failed(job_id, exc)
        raise


@celery_app.task(name="ingestion.curated_judgment", autoretry_for=(Exception,), retry_backoff=True, retry_jitter=True, max_retries=3)
def curated_judgment_task(job_id: int, domain: str | None, limit: int | None, dry_run: bool, resume_job_id: int | None) -> dict:
    try:
        result = run_curated_judgment_ingestion(
            domain=domain,
            limit=limit,
            dry_run=dry_run,
            resume_job_id=resume_job_id,
            queued_job_id=job_id,
        )
        return result.as_dict()
    except Exception as exc:
        _mark_failed(job_id, exc)
        raise


@celery_app.task(name="embeddings.lifecycle_backfill", autoretry_for=(Exception,), retry_backoff=True, retry_jitter=True, max_retries=2)
def embedding_backfill_task(
    job_id: int,
    mode: str,
    limit: int | None,
    page_size: int,
    retry_failed: bool,
) -> dict:
    try:
        return create_embeddings(
            limit=limit,
            page_size=page_size,
            mode=mode,  # type: ignore[arg-type]
            retry_failed=retry_failed,
            job_id=job_id,
        )
    except Exception as exc:
        _mark_failed(job_id, exc)
        raise
