"""Minimal FastAPI surface for milestone-2 ingestion and retrieval."""

from __future__ import annotations

from datetime import date
from typing import Any, Optional

import base64
import binascii
import json
import time

from celery.exceptions import CeleryError
from fastapi import Depends, FastAPI, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from starlette.responses import StreamingResponse

from agentic_orchestrator import chat
from api.auth import AuthenticatedUser, get_current_user
from backend_common import get_logger, get_session_factory
from ingestion.tasks import (
    curated_judgment_task,
    curated_law_task,
    embedding_backfill_task,
)
from repositories.embeddings import (
    get_embedding_coverage,
    mark_embedding_lifecycle_states,
    summarize_embedding_coverage,
)
from repositories.ingestion_jobs import (
    create_job,
    finalize_job,
    get_job_details,
    list_jobs,
)
from repositories.legal_documents import (
    get_document_by_source_id,
    list_sample_documents,
)
from repositories.matters import (
    MatterInput,
    ResearchMemoInput,
    ResearchNoteInput,
    create_research_memo,
    create_matter,
    delete_matter,
    get_matter,
    link_document,
    link_run,
    list_matters,
    save_research_note,
    update_matter,
)
from services.document_text_extraction import (
    DocumentExtractionError,
    UnsupportedDocumentError,
    extract_document_text,
)
from repositories.user_settings import get_or_create_settings, update_settings
from search import hybrid_search
from workflow_engine import build_registry

LOGGER = get_logger("api.main")
app = FastAPI(title="Clarvo Legal Backend", version="milestone2")


class IngestRequest(BaseModel):
    """Shared ingest request model for curated law and judgment endpoints."""

    domain: Optional[str] = None
    limit: Optional[int] = None
    dry_run: bool = False
    resume_job_id: Optional[int] = None


class EmbeddingJobRequest(BaseModel):
    """Request body for embedding lifecycle jobs."""

    mode: str = "all"
    limit: Optional[int] = None
    page_size: int = 500
    retry_failed: bool = False


class EnqueueResponse(BaseModel):
    """Response returned by enqueue-only ingestion endpoints."""

    job_id: int
    task_id: str
    status: str


class WorkflowRunRequest(BaseModel):
    """Request body for running a workflow."""

    client_id: Optional[str] = None
    document_ids: Optional[list[str]] = None
    question: Optional[str] = None


class AgentConversationMessage(BaseModel):
    """Prior chat message supplied by the client for ephemeral chat context."""

    role: str
    content: str


class AgentClientDocument(BaseModel):
    """Client-provided document text supplied only for the current chat."""

    name: str
    text: str


class AgentDocumentExtractionRequest(BaseModel):
    """Base64-encoded document upload for ephemeral assistant context."""

    filename: str
    content_type: Optional[str] = None
    data_base64: str


class AgentDocumentExtractionResponse(BaseModel):
    """Extracted upload text returned to the chat client."""

    name: str
    text: str
    truncated: bool


class AgentStreamRequest(BaseModel):
    """Request body for source-backed agent streaming."""

    question: str
    max_iterations: int = 4
    domain: Optional[str] = None
    conversation_history: list[AgentConversationMessage] = Field(default_factory=list)
    client_documents: list[AgentClientDocument] = Field(default_factory=list)


class MatterRequest(BaseModel):
    """Matter create/update payload."""

    title: Optional[str] = None
    client: Optional[str] = None
    status: Optional[str] = None
    opened_at: Optional[date] = None
    closed_at: Optional[date] = None
    rechtsgebied: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[dict] = None


class MatterLinkDocumentRequest(BaseModel):
    """Request body for linking a document to a matter."""

    document_id: str


class MatterLinkRunRequest(BaseModel):
    """Request body for linking an agent or workflow run to a matter."""

    run_id: str
    run_type: Optional[str] = None


class MatterResearchNoteRequest(BaseModel):
    """Request body for saving a grounded assistant answer to a matter."""

    matter_id: Optional[str] = None
    question: str
    answer: str
    status: str
    citations: list[dict[str, Any]]
    source_ids: list[str] = []
    domains: list[str] = []


class MatterResearchMemoRequest(BaseModel):
    """Request body for drafting a memo from a saved research note."""

    matter_id: str
    source_note_id: str


class SettingsRequest(BaseModel):
    """Persisted user settings payload."""

    display_name: Optional[str] = None
    firm_name: Optional[str] = None
    theme_preference: Optional[str] = None
    bwb_enabled: Optional[bool] = None
    rechtspraak_enabled: Optional[bool] = None
    openai_key_configured: Optional[bool] = None
    cohere_key_configured: Optional[bool] = None
    primary_domain: Optional[str] = None
    onboarding_completed: Optional[bool] = None


def _sse_payload(payload: dict[str, object]) -> str:
    """Serialize one JSON server-sent event frame."""
    return f"data: {json.dumps(payload)}\n\n"


def _enqueue_ingestion(
    *,
    request: IngestRequest,
    job_type: str,
    source_system: str,
    task,
) -> EnqueueResponse:
    """Create a queued ingestion job and dispatch the Celery task."""
    job = create_job(
        job_type=job_type,
        source_system=source_system,
        domain=request.domain,
        total_items=0,
        notes="queued via API",
        status="queued",
    )
    try:
        async_result = task.delay(
            job.id,
            request.domain,
            request.limit,
            request.dry_run,
            request.resume_job_id,
        )
    except CeleryError as exc:
        finalize_job(
            job.id,
            status="failed",
            success_count=0,
            failure_count=1,
            notes=f"enqueue failed: {exc}",
        )
        raise HTTPException(
            status_code=503, detail=f"Could not enqueue ingestion task: {exc}"
        ) from exc
    return EnqueueResponse(job_id=job.id, task_id=async_result.id, status="queued")


def _validate_embedding_request(request: EmbeddingJobRequest) -> None:
    if request.mode not in {"missing", "stale", "failed", "all"}:
        raise HTTPException(
            status_code=422,
            detail="mode must be one of: missing, stale, failed, all.",
        )
    if request.page_size < 1 or request.page_size > 1000:
        raise HTTPException(
            status_code=422, detail="page_size must be between 1 and 1000."
        )
    if request.limit is not None and request.limit < 1:
        raise HTTPException(
            status_code=422, detail="limit must be at least 1 when provided."
        )


def _enqueue_embedding_job(request: EmbeddingJobRequest) -> EnqueueResponse:
    _validate_embedding_request(request)
    job = create_job(
        job_type=f"embedding_{request.mode}",
        source_system="openai_embeddings",
        domain=None,
        total_items=0,
        notes="queued via API",
        status="queued",
    )
    try:
        async_result = embedding_backfill_task.delay(
            job.id,
            request.mode,
            request.limit,
            request.page_size,
            request.retry_failed,
        )
    except CeleryError as exc:
        finalize_job(
            job.id,
            status="failed",
            success_count=0,
            failure_count=1,
            notes=f"enqueue failed: {exc}",
        )
        raise HTTPException(
            status_code=503, detail=f"Could not enqueue embedding task: {exc}"
        ) from exc
    return EnqueueResponse(job_id=job.id, task_id=async_result.id, status="queued")


@app.get("/health")
def health() -> dict:
    """Return service and database health status."""
    session_factory = get_session_factory()
    with session_factory() as session:
        session.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get("/documents")
def list_documents(
    _user: AuthenticatedUser = Depends(get_current_user),
    source_type: Optional[str] = Query(default=None),
    domain: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=200),
) -> dict:
    """Return a small filtered sample of stored document rows."""
    documents = list_sample_documents(
        limit=limit, source_type=source_type, domain=domain
    )
    return {
        "count": len(documents),
        "documents": [document.as_dict() for document in documents],
    }


@app.get("/documents/{source_id}")
def get_documents(
    source_id: str,
    _user: AuthenticatedUser = Depends(get_current_user),
    domain: Optional[str] = Query(default=None),
) -> dict:
    """Return stored rows for one source identifier."""
    documents = get_document_by_source_id(source_id, domain=domain)
    if not documents:
        raise HTTPException(
            status_code=404, detail=f"No documents found for source_id={source_id}"
        )
    return {
        "source_id": source_id,
        "count": len(documents),
        "documents": [document.as_dict() for document in documents],
    }


@app.get("/laws/{bwb_id}")
def get_law(
    bwb_id: str,
    _user: AuthenticatedUser = Depends(get_current_user),
    domain: Optional[str] = Query(default=None),
) -> dict:
    """Return stored rows for one BWB/BWBR legislation source."""
    documents = get_document_by_source_id(bwb_id, domain=domain)
    if not documents:
        raise HTTPException(
            status_code=404, detail=f"No law documents found for bwb_id={bwb_id}"
        )
    return {
        "bwb_id": bwb_id,
        "count": len(documents),
        "documents": [document.as_dict() for document in documents],
    }


@app.get("/judgments/{ecli:path}")
def get_judgment(
    ecli: str,
    _user: AuthenticatedUser = Depends(get_current_user),
    domain: Optional[str] = Query(default=None),
) -> dict:
    """Return stored rows for one ECLI judgment."""
    documents = get_document_by_source_id(ecli, domain=domain)
    if not documents:
        raise HTTPException(
            status_code=404, detail=f"No judgment documents found for ecli={ecli}"
        )
    return {
        "ecli": ecli,
        "count": len(documents),
        "documents": [document.as_dict() for document in documents],
    }


@app.get("/search")
def search_documents(
    _user: AuthenticatedUser = Depends(get_current_user),
    q: str = Query(..., min_length=1),
    source_type: Optional[str] = Query(default=None),
    domain: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
) -> dict:
    """Run the DB-backed hybrid search path with simple filters."""
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=422,
            detail="date_from must be earlier than or equal to date_to.",
        )
    vector_k = min(max(limit, 3), 25)
    hits = hybrid_search(
        q,
        k_bm25=limit,
        k_vector=vector_k,
        source_type=source_type,
        domain=domain,
        date_from=date_from.isoformat() if date_from else None,
        date_to=date_to.isoformat() if date_to else None,
    )[:limit]
    return {
        "query": q,
        "count": len(hits),
        "results": [hit.as_dict() for hit in hits],
    }


@app.get("/matters")
def get_matters(
    user: AuthenticatedUser = Depends(get_current_user),
    q: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    rechtsgebied: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict:
    """Return user-owned matters with simple filters."""
    matters = list_matters(
        user_id=user.user_id,
        query=q,
        status=status,
        rechtsgebied=rechtsgebied,
        limit=limit,
    )
    return {"count": len(matters), "matters": [matter.as_dict() for matter in matters]}


@app.post("/matters")
def post_matter(
    request: MatterRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    """Create a user-owned matter."""
    title = request.title.strip() if request.title else ""
    if not title:
        raise HTTPException(status_code=422, detail="Matter title is required.")
    matter = create_matter(
        user_id=user.user_id,
        values=MatterInput(
            title=title,
            client=request.client,
            status=request.status or "active",
            opened_at=request.opened_at,
            closed_at=request.closed_at,
            rechtsgebied=request.rechtsgebied,
            description=request.description,
            tags=request.tags,
        ),
    )
    return {"matter": matter.as_dict()}


@app.post("/matters/research-notes")
def post_matter_research_note(
    request: MatterResearchNoteRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    """Save a grounded assistant research note to a matter."""
    try:
        matter, note = save_research_note(
            user_id=user.user_id,
            values=ResearchNoteInput(
                matter_id=request.matter_id,
                question=request.question,
                answer=request.answer,
                status=request.status,
                citations=request.citations,
                source_ids=request.source_ids,
                domains=request.domains,
            ),
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"matter": matter.as_dict(), "note": note}


@app.post("/matters/research-memos")
def post_matter_research_memo(
    request: MatterResearchMemoRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    """Draft a research memo from a grounded saved research note."""
    try:
        matter, memo = create_research_memo(
            user_id=user.user_id,
            values=ResearchMemoInput(
                matter_id=request.matter_id,
                source_note_id=request.source_note_id,
            ),
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"matter": matter.as_dict(), "memo": memo}


@app.get("/matters/{matter_id}")
def get_matter_endpoint(
    matter_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    """Return one user-owned matter."""
    try:
        matter = get_matter(user_id=user.user_id, matter_id=matter_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"matter": matter.as_dict()}


@app.patch("/matters/{matter_id}")
def patch_matter(
    matter_id: str,
    request: MatterRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    """Patch one user-owned matter."""
    try:
        matter = update_matter(
            user_id=user.user_id,
            matter_id=matter_id,
            values=request.model_dump(exclude_unset=True),
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"matter": matter.as_dict()}


@app.delete("/matters/{matter_id}")
def delete_matter_endpoint(
    matter_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    """Archive one matter."""
    try:
        delete_matter(user_id=user.user_id, matter_id=matter_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"status": "archived"}


@app.post("/matters/{matter_id}/link-document")
def post_matter_document_link(
    matter_id: str,
    request: MatterLinkDocumentRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    """Link a document UUID to a matter."""
    try:
        link_document(
            user_id=user.user_id, matter_id=matter_id, document_id=request.document_id
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"status": "linked"}


@app.post("/matters/{matter_id}/link-run")
def post_matter_run_link(
    matter_id: str,
    request: MatterLinkRunRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    """Link an agent or workflow run to a matter."""
    try:
        link_run(
            user_id=user.user_id,
            matter_id=matter_id,
            run_id=request.run_id,
            run_type=request.run_type,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"status": "linked"}


@app.get("/settings")
def get_settings(user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    """Return persisted settings for the current user."""
    settings = get_or_create_settings(user.user_id)
    return {"settings": settings.as_dict()}


@app.patch("/settings")
def patch_settings(
    request: SettingsRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    """Patch persisted settings for the current user."""
    settings = update_settings(user.user_id, request.model_dump(exclude_unset=True))
    return {"settings": settings.as_dict()}


@app.post(
    "/ingest/laws", response_model=EnqueueResponse, status_code=status.HTTP_202_ACCEPTED
)
def ingest_laws(
    request: IngestRequest, _user: AuthenticatedUser = Depends(get_current_user)
) -> EnqueueResponse:
    """Queue curated legislation ingestion and return immediately."""
    return _enqueue_ingestion(
        request=request,
        job_type="curated_laws",
        source_system="bwb",
        task=curated_law_task,
    )


@app.post(
    "/ingest/judgments",
    response_model=EnqueueResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def ingest_judgments(
    request: IngestRequest, _user: AuthenticatedUser = Depends(get_current_user)
) -> EnqueueResponse:
    """Queue curated case-law ingestion and return immediately."""
    return _enqueue_ingestion(
        request=request,
        job_type="curated_judgments",
        source_system="rechtspraak",
        task=curated_judgment_task,
    )


@app.post(
    "/ingest/curated-law",
    response_model=EnqueueResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def enqueue_curated_law(
    request: IngestRequest,
    _user: AuthenticatedUser = Depends(get_current_user),
) -> EnqueueResponse:
    """Queue curated legislation ingestion and return immediately."""
    return _enqueue_ingestion(
        request=request,
        job_type="curated_laws",
        source_system="bwb",
        task=curated_law_task,
    )


@app.post(
    "/ingest/curated-judgment",
    response_model=EnqueueResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def enqueue_curated_judgment(
    request: IngestRequest,
    _user: AuthenticatedUser = Depends(get_current_user),
) -> EnqueueResponse:
    """Queue curated judgment ingestion and return immediately."""
    return _enqueue_ingestion(
        request=request,
        job_type="curated_judgments",
        source_system="rechtspraak",
        task=curated_judgment_task,
    )


@app.get("/embeddings/coverage")
def get_embeddings_coverage(
    _user: AuthenticatedUser = Depends(get_current_user),
    refresh: bool = Query(default=False),
    refresh_limit: Optional[int] = Query(default=None, ge=1),
) -> dict:
    """Return grouped embedding lifecycle coverage for operators."""
    refresh_result = None
    if refresh:
        refresh_result = mark_embedding_lifecycle_states(limit=refresh_limit)
    rows = get_embedding_coverage()
    return {
        "totals": summarize_embedding_coverage(rows),
        "groups": [row.as_dict() for row in rows],
        "refresh": refresh_result,
    }


@app.post(
    "/embeddings/backfill",
    response_model=EnqueueResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def enqueue_embedding_backfill(
    request: EmbeddingJobRequest,
    _user: AuthenticatedUser = Depends(get_current_user),
) -> EnqueueResponse:
    """Queue a lifecycle-aware embedding backfill job."""
    return _enqueue_embedding_job(request)


@app.post(
    "/embeddings/reembed-stale",
    response_model=EnqueueResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def enqueue_embedding_reembed_stale(
    request: EmbeddingJobRequest,
    _user: AuthenticatedUser = Depends(get_current_user),
) -> EnqueueResponse:
    """Queue a stale embedding refresh job."""
    request.mode = "stale"
    return _enqueue_embedding_job(request)


@app.get("/ingestion/jobs")
def get_ingestion_jobs(
    _user: AuthenticatedUser = Depends(get_current_user),
    limit: int = Query(default=20, ge=1, le=200),
) -> dict:
    """Return recent ingestion jobs."""
    jobs = list_jobs(limit=limit)
    return {
        "count": len(jobs),
        "jobs": [job.as_dict() for job in jobs],
    }


@app.get("/ingestion/jobs/{job_id}")
def get_ingestion_job(
    job_id: int, _user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    """Return one ingestion job and all recorded item statuses."""
    try:
        details = get_job_details(job_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        "job": details.job.as_dict(),
        "items": [item.as_dict() for item in details.items],
    }


@app.get("/ingestion/jobs/{job_id}/stream")
def stream_ingestion_job(
    job_id: int,
    _user: AuthenticatedUser = Depends(get_current_user),
) -> StreamingResponse:
    """Stream ingestion job status as server-sent events."""

    def event_stream():
        while True:
            try:
                details = get_job_details(job_id)
            except LookupError as exc:
                yield f"event: error\ndata: {json.dumps({'message': str(exc)})}\n\n"
                return

            payload = {
                "job": details.job.as_dict(),
                "items": [item.as_dict() for item in details.items],
            }
            yield f"event: status\ndata: {json.dumps(payload)}\n\n"

            if details.job.status in {"completed", "completed_with_errors", "failed"}:
                return
            time.sleep(1)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/workflows")
def list_workflows(_user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    """Return registered workflow metadata."""
    workflows = build_registry().list()
    return {
        "count": len(workflows),
        "workflows": [
            {
                "id": workflow.name,
                "name": workflow.name,
                "domain": workflow.domain,
                "step_count": len(workflow.steps),
                "steps": [step.__name__ for step in workflow.steps],
            }
            for workflow in workflows
        ],
    }


@app.post("/workflows/{workflow_id}/run")
def run_workflow(
    workflow_id: str,
    request: WorkflowRunRequest,
    _user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    """Run a registered workflow synchronously."""
    registry = build_registry()
    try:
        workflow = registry.get(workflow_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    result = workflow.run(
        {
            "client_id": request.client_id,
            "document_ids": request.document_ids,
            "question": request.question,
        }
    )
    return {
        "workflow_id": workflow_id,
        "result": result,
    }


@app.post("/agent/stream")
def stream_agent(
    request: AgentStreamRequest,
    _user: AuthenticatedUser = Depends(get_current_user),
) -> StreamingResponse:
    """Run the source-backed agent and stream answer tokens and citations as SSE."""

    def event_stream():
        result = chat(
            request.question,
            max_iterations=request.max_iterations,
            domain=request.domain,
            conversation_history=[
                message.model_dump() for message in request.conversation_history
            ],
            client_documents=[
                document.model_dump() for document in request.client_documents
            ],
        )
        if result.get("status") == "insufficient_sources":
            yield _sse_payload({"type": "insufficient_sources", **result})
            return

        answer = str(result.get("answer") or "")
        for token in answer.split(" "):
            if token:
                yield _sse_payload({"type": "token", "content": f"{token} "})

        for citation in result.get("citations") or []:
            yield _sse_payload(
                {
                    "type": "citation",
                    "label": citation.get("title")
                    or citation.get("source_id")
                    or citation.get("id")
                    or "Source",
                    "source_id": citation.get("source_id") or citation.get("id"),
                    "citation": citation,
                }
            )

        yield _sse_payload(
            {
                "type": "done",
                "status": result.get("status"),
                "question": result.get("question"),
                "source_ids": result.get("source_ids", []),
                "tool_trace": result.get("tool_trace", []),
            }
        )

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/agent/extract-document", response_model=AgentDocumentExtractionResponse)
def extract_agent_document(
    request: AgentDocumentExtractionRequest,
    _user: AuthenticatedUser = Depends(get_current_user),
) -> AgentDocumentExtractionResponse:
    """Extract readable text from a chat upload without storing the file."""
    try:
        payload = base64.b64decode(request.data_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid file payload.") from exc

    try:
        extracted = extract_document_text(
            request.filename,
            request.content_type,
            payload,
        )
    except UnsupportedDocumentError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    except DocumentExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return AgentDocumentExtractionResponse(
        name=extracted.name,
        text=extracted.text,
        truncated=extracted.truncated,
    )


@app.post("/agent/chat")
def chat_agent(
    request: AgentStreamRequest,
    _user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    """Run the grounded assistant and return one JSON response."""
    return chat(
        request.question,
        max_iterations=request.max_iterations,
        domain=request.domain,
        conversation_history=[
            message.model_dump() for message in request.conversation_history
        ],
        client_documents=[
            document.model_dump() for document in request.client_documents
        ],
    )
