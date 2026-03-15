"""Minimal FastAPI surface for milestone-2 ingestion and retrieval."""

from __future__ import annotations

from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text

from backend_common import get_logger, get_session_factory
from ingestion.curated_ingestion import run_curated_judgment_ingestion, run_curated_law_ingestion
from repositories.ingestion_jobs import get_job_details, list_jobs
from repositories.legal_documents import get_document_by_source_id, list_sample_documents
from search import bm25_search


LOGGER = get_logger("api.main")
app = FastAPI(title="Veridicta Legal Backend", version="milestone2")


class IngestRequest(BaseModel):
    """Shared ingest request model for curated law and judgment endpoints."""

    domain: Optional[str] = None
    limit: Optional[int] = None
    dry_run: bool = False
    resume_job_id: Optional[int] = None


@app.get("/health")
def health() -> dict:
    """Return service and database health status."""
    session_factory = get_session_factory()
    with session_factory() as session:
        session.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get("/documents")
def list_documents(
    source_type: Optional[str] = Query(default=None),
    domain: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=200),
) -> dict:
    """Return a small filtered sample of stored document rows."""
    documents = list_sample_documents(limit=limit, source_type=source_type, domain=domain)
    return {
        "count": len(documents),
        "documents": [document.as_dict() for document in documents],
    }


@app.get("/documents/{source_id}")
def get_documents(source_id: str, domain: Optional[str] = Query(default=None)) -> dict:
    """Return stored rows for one source identifier."""
    documents = get_document_by_source_id(source_id, domain=domain)
    if not documents:
        raise HTTPException(status_code=404, detail=f"No documents found for source_id={source_id}")
    return {
        "source_id": source_id,
        "count": len(documents),
        "documents": [document.as_dict() for document in documents],
    }


@app.get("/search")
def search_documents(
    q: str = Query(..., min_length=1),
    source_type: Optional[str] = Query(default=None),
    domain: Optional[str] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
) -> dict:
    """Run the existing DB full-text search path with simple filters."""
    hits = bm25_search(q, limit=limit, source_type=source_type, domain=domain)
    return {
        "query": q,
        "count": len(hits),
        "results": [hit.as_dict() for hit in hits],
    }


@app.post("/ingest/laws")
def ingest_laws(request: IngestRequest) -> dict:
    """Run curated legislation ingestion synchronously."""
    result = run_curated_law_ingestion(
        domain=request.domain,
        limit=request.limit,
        dry_run=request.dry_run,
        resume_job_id=request.resume_job_id,
    )
    return result.as_dict()


@app.post("/ingest/judgments")
def ingest_judgments(request: IngestRequest) -> dict:
    """Run curated case-law ingestion synchronously."""
    result = run_curated_judgment_ingestion(
        domain=request.domain,
        limit=request.limit,
        dry_run=request.dry_run,
        resume_job_id=request.resume_job_id,
    )
    return result.as_dict()


@app.get("/ingestion/jobs")
def get_ingestion_jobs(limit: int = Query(default=20, ge=1, le=200)) -> dict:
    """Return recent ingestion jobs."""
    jobs = list_jobs(limit=limit)
    return {
        "count": len(jobs),
        "jobs": [job.as_dict() for job in jobs],
    }


@app.get("/ingestion/jobs/{job_id}")
def get_ingestion_job(job_id: int) -> dict:
    """Return one ingestion job and all recorded item statuses."""
    try:
        details = get_job_details(job_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        "job": details.job.as_dict(),
        "items": [item.as_dict() for item in details.items],
    }
