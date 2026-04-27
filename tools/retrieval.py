from __future__ import annotations

import os
from typing import Literal, Optional

from pydantic import BaseModel, Field

from backend_common import DEFAULT_CHAT_MODEL, compact_text, get_session_factory
from repositories.legal_documents import get_document_by_source_id
from tools.base import BaseTool


class SearchInput(BaseModel):
    query: str = Field(min_length=1)
    limit: int = Field(default=5, ge=1, le=25)
    domain: Optional[str] = None
    source_type: Optional[str] = None


class CiteLookupInput(BaseModel):
    identifier: str = Field(
        min_length=1, description="BWB-id, BWBR-id, ECLI, or source_id"
    )
    domain: Optional[str] = None


class SummariseInput(BaseModel):
    document_text: str = Field(min_length=1)
    language: Literal["en", "nl"] = "en"


class SearchLegislationTool(BaseTool):
    name = "search_legislation"
    description = "Search stored BWB legislation chunks with source-backed ranking."
    input_schema = SearchInput

    def _run(self, payload: SearchInput) -> dict:
        from search import bm25_search

        hits = bm25_search(
            payload.query,
            limit=payload.limit,
            source_type="legislation",
            domain=payload.domain,
        )
        return {"hits": [hit.as_dict() for hit in hits]}


class KnowledgeLookupTool(BaseTool):
    name = "knowledge_lookup"
    description = "Search stored legal sources with hybrid retrieval and return citation-ready hits."
    input_schema = SearchInput

    def _run(self, payload: SearchInput) -> dict:
        from search import hybrid_search

        hits = hybrid_search(
            payload.query,
            k_bm25=payload.limit,
            k_vector=payload.limit,
            source_type=payload.source_type,
            domain=payload.domain,
        )[: payload.limit]
        return {"hits": [hit.as_dict() for hit in hits]}


class SearchCaseLawTool(BaseTool):
    name = "search_case_law"
    description = "Search stored Rechtspraak ECLI judgments with source-backed ranking."
    input_schema = SearchInput

    def _run(self, payload: SearchInput) -> dict:
        from search import bm25_search

        hits = bm25_search(
            payload.query,
            limit=payload.limit,
            source_type="case_law",
            domain=payload.domain,
        )
        return {"hits": [hit.as_dict() for hit in hits]}


class CiteLookupTool(BaseTool):
    name = "cite_lookup"
    description = (
        "Resolve an exact BWB/BWBR/ECLI/source identifier to stored documents."
    )
    input_schema = CiteLookupInput

    def _run(self, payload: CiteLookupInput) -> dict:
        direct_matches = get_document_by_source_id(
            payload.identifier, domain=payload.domain
        )
        if direct_matches:
            return {"hits": [document.as_dict() for document in direct_matches]}

        session_factory = get_session_factory()
        with session_factory() as session:
            from backend_common import Document

            documents = (
                session.query(Document)
                .filter(
                    (Document.ecli == payload.identifier)
                    | (Document.bwbr_id == payload.identifier)
                )
                .order_by(
                    Document.article.asc().nullsfirst(),
                    Document.section.asc().nullsfirst(),
                )
                .limit(50)
                .all()
            )
        return {"hits": [document.as_dict() for document in documents]}


class SummariseDocumentTool(BaseTool):
    name = "summarise_document"
    description = "Summarise retrieved documents. Uses OpenAI when configured, otherwise returns extractive snippets."
    input_schema = SummariseInput

    def _run(self, payload: SummariseInput) -> dict:
        text = compact_text(payload.document_text)
        if not os.getenv("OPENAI_API_KEY"):
            return {"summary": text[:900] + ("..." if len(text) > 900 else "")}

        from agents import Agent, Runner
        import asyncio

        instructions = (
            "Summarise the legal document concisely. Stay fact-based and preserve Dutch legal terminology. "
            "Mention obligations, deadlines, legal tests, and citations when present."
        )
        agent = Agent(
            name="SummariseDocumentTool",
            instructions=instructions,
            model=DEFAULT_CHAT_MODEL,
        )
        result = asyncio.run(Runner.run(agent, text[:12000]))
        return {"summary": str(result.final_output)}
