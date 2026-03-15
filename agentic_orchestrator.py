"""
Simple agentic search loop built around OpenAI's Python tooling.

The orchestrator is intentionally lightweight:
1. Tool objects are regular Python classes with `name`, `description`, and
   `run()` methods.
2. A planning loop decides which tool to call next.
3. Collected passages are passed to a GPT-4-class model for final synthesis
   with source citations.

This is designed to be easy to extend with additional tool bundles later.

Environment variables:
- OPENAI_API_KEY
- OPENAI_CHAT_MODEL (optional, defaults to gpt-4.1)
- DATABASE_URL

Optional dependency:
- openai-agents

Example:
    python agentic_orchestrator.py
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from typing import Any, Optional

from backend_common import DEFAULT_CHAT_MODEL, SearchHit, compact_text, get_logger, get_openai_client
from search import bm25_search, hybrid_search, vector_search


LOGGER = get_logger("agentic_orchestrator")


class Tool:
    """Base tool contract used by the orchestrator."""

    name: str
    description: str

    def run(self, **kwargs: Any) -> dict:
        """Execute the tool with keyword arguments."""
        raise NotImplementedError


class BM25Tool(Tool):
    """Tool wrapper around PostgreSQL full-text search."""

    name = "bm25_tool"
    description = "Searches structured legal documents with BM25-style PostgreSQL full-text ranking."

    def run(self, query: str, limit: int = 5, **_: Any) -> dict:
        hits = [hit.as_dict() for hit in bm25_search(query, limit=limit)]
        return {"hits": hits}


class VectorTool(Tool):
    """Tool wrapper around pgvector similarity search."""

    name = "vector_tool"
    description = "Searches semantic embeddings to find contextually similar legal passages."

    def run(self, query: str, limit: int = 5, **_: Any) -> dict:
        hits = [hit.as_dict() for hit in vector_search(query, limit=limit)]
        return {"hits": hits}


class KnowledgeLookupTool(Tool):
    """
    Placeholder knowledge tool for future case law integrations.

    It currently returns deterministic mock results so the orchestration flow
    can be expanded later without changing the tool contract.
    """

    name = "knowledge_lookup"
    description = "Looks up case law or external knowledge sources."

    def run(self, query: str, **_: Any) -> dict:
        return {
            "hits": [
                {
                    "id": "knowledge:dummy:1",
                    "article": None,
                    "text": f"Dummy case law lookup result for query: {query}",
                    "source_url": None,
                    "source": "knowledge_lookup",
                }
            ]
        }


class DocumentSummaryTool(Tool):
    """Summarize one or more legal passages using a GPT-4-class model."""

    name = "document_summary"
    description = "Summarizes retrieved documents into a concise legal brief."

    def run(self, document_text: str, **_: Any) -> dict:
        summary = run_simple_agent(
            name="DocumentSummaryAgent",
            instructions=(
                "Summarize the legal document below. Keep the result concise, "
                "fact-based, and explicit about key obligations, deadlines, "
                "or legal consequences."
            ),
            prompt=document_text,
        )
        return {"summary": summary}


def run_simple_agent(name: str, instructions: str, prompt: str) -> str:
    """
    Run a small OpenAI agent and return final text output.

    The import is kept local so the module remains importable even before
    `openai-agents` is installed.
    """
    from agents import Agent, Runner  # Imported lazily by design.

    agent = Agent(name=name, instructions=instructions, model=DEFAULT_CHAT_MODEL)
    result = asyncio.run(Runner.run(agent, prompt))
    return str(result.final_output)


def _tool_registry() -> dict[str, Tool]:
    """Return the tool registry for the orchestrator."""
    tools = [BM25Tool(), VectorTool(), KnowledgeLookupTool(), DocumentSummaryTool()]
    return {tool.name: tool for tool in tools}


def plan_next_tool(question: str, iteration: int, collected_hits: list[dict]) -> tuple[str, dict]:
    """
    Choose the next tool based on the query and current retrieval state.

    Heuristics are used here deliberately:
    - `article`, `bw`, `awb`, `lease`, `huur`, `notice`, `opzeg` => BM25 first
    - `summarize` / `samenvat` => summary if context already exists
    - otherwise semantic search after the initial pass
    """
    lowered = question.lower()

    if collected_hits and any(keyword in lowered for keyword in ("summarize", "samenvat", "summary")):
        return "document_summary", {"document_text": "\n\n".join(hit["text"] for hit in collected_hits[:5])}

    if iteration == 0 and any(
        keyword in lowered for keyword in ("article", "artikel", "bw", "awb", "huur", "lease", "notice", "opzeg")
    ):
        return "bm25_tool", {"query": question, "limit": 5}

    if iteration == 0:
        return "vector_tool", {"query": question, "limit": 5}

    if iteration == 1:
        return "vector_tool", {"query": question, "limit": 5}

    if iteration == 2:
        return "knowledge_lookup", {"query": question}

    return "document_summary", {"document_text": "\n\n".join(hit["text"] for hit in collected_hits[:5])}


def has_sufficient_context(question: str, collected_hits: list[dict]) -> bool:
    """
    Decide whether enough evidence has been gathered for answer generation.

    This remains intentionally simple:
    - at least 2 passages, or
    - at least 1 passage that explicitly mentions an article identifier.
    """
    if len(collected_hits) >= 2:
        return True

    lowered = question.lower()
    for hit in collected_hits:
        article = compact_text(hit.get("article") or "")
        text = compact_text(hit.get("text") or "").lower()
        if article and (article.lower() in lowered or "artikel" in text or "article" in text):
            return True

    return False


def deduplicate_hits(existing: list[dict], new_hits: list[dict]) -> list[dict]:
    """Merge result sets while keeping the first occurrence of each source ID."""
    merged = {hit["id"]: hit for hit in existing}
    for hit in new_hits:
        merged.setdefault(hit["id"], hit)
    return list(merged.values())


def generate_answer(question: str, collected_hits: list[dict]) -> dict:
    """Synthesize a final answer with source citations."""
    if not collected_hits:
        return {"answer": "No relevant sources were found.", "source_ids": []}

    context_blocks = []
    for hit in collected_hits:
        context_blocks.append(
            (
                f"Source ID: {hit['id']}\n"
                f"Article: {hit.get('article')}\n"
                f"Section: {hit.get('section')}\n"
                f"Text: {hit.get('text')}\n"
            )
        )

    answer = run_simple_agent(
        name="LegalAnswerAgent",
        instructions=(
            "You are a Dutch legal research assistant. Answer only using the provided "
            "sources. Cite supporting sources inline using the exact format [source_id]. "
            "If the sources are incomplete, say so explicitly."
        ),
        prompt=(
            f"Question:\n{question}\n\n"
            f"Sources:\n{chr(10).join(context_blocks)}\n\n"
            "Provide a concise answer with citations."
        ),
    )
    return {"answer": answer, "source_ids": [hit["id"] for hit in collected_hits]}


def chat(question: str, max_iterations: int = 4) -> dict:
    """
    Run the search loop until sufficient context is collected.

    Returns a dictionary with:
    - answer
    - source_ids
    - tool_trace
    """
    tools = _tool_registry()
    collected_hits: list[dict] = []
    tool_trace: list[dict] = []

    for iteration in range(max_iterations):
        tool_name, tool_kwargs = plan_next_tool(question, iteration, collected_hits)
        tool = tools[tool_name]
        LOGGER.info("Iteration %s selecting tool=%s", iteration + 1, tool.name)

        result = tool.run(**tool_kwargs)
        tool_trace.append({"tool": tool.name, "input": tool_kwargs, "output_keys": list(result.keys())})

        if "hits" in result:
            collected_hits = deduplicate_hits(collected_hits, result["hits"])
        elif "summary" in result:
            collected_hits.append(
                {
                    "id": f"summary:{iteration + 1}",
                    "article": None,
                    "section": None,
                    "text": result["summary"],
                    "source_url": None,
                    "source": "document_summary",
                }
            )

        if has_sufficient_context(question, collected_hits):
            break

    final = generate_answer(question, collected_hits)
    final["tool_trace"] = tool_trace
    return final


if __name__ == "__main__":
    example_question = "What are the notice periods for leases according to Article 7:271 BW?"
    result = chat(example_question)
    print("Question:", example_question)
    print("\nAnswer:\n", result["answer"])
    print("\nSource IDs:")
    for source_id in result["source_ids"]:
        print("-", source_id)
