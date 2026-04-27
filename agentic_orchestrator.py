"""Grounded assistant flow for Veridicta.

The assistant is intentionally retrieval-first: it looks up stored legal
sources, answers from those sources when evidence is available, and refuses
when the corpus does not support the question.
"""

from __future__ import annotations

import os

from backend_common import DEFAULT_CHAT_MODEL, compact_text, get_logger
from tools import CiteLookupTool, KnowledgeLookupTool


LOGGER = get_logger("agentic_orchestrator")
MIN_GROUNDED_SOURCES = 1


def _source_label(hit: dict) -> str:
    return str(hit.get("source_id") or hit.get("ecli") or hit.get("bwbr_id") or hit.get("id"))


def _citation(hit: dict) -> dict:
    return {
        "id": hit.get("id"),
        "source_id": hit.get("source_id"),
        "source_type": hit.get("source_type"),
        "domain": hit.get("domain"),
        "title": hit.get("title"),
        "article": hit.get("article"),
        "section": hit.get("section"),
        "court": hit.get("court"),
        "decision_date": hit.get("decision_date"),
        "source_url": hit.get("source_url"),
        "snippet": compact_text(hit.get("text") or "")[:360],
    }


def _deduplicate_hits(hits: list[dict]) -> list[dict]:
    merged: dict[str, dict] = {}
    for hit in hits:
        key = str(hit.get("id") or _source_label(hit))
        merged.setdefault(key, hit)
    return list(merged.values())


def _refusal(question: str, hits: list[dict], tool_trace: list[dict]) -> dict:
    return {
        "status": "insufficient_sources",
        "answer": (
            "Ik kan deze vraag niet betrouwbaar beantwoorden met de huidige opgeslagen bronnen. "
            "Verbreed de zoekvraag, kies een ander rechtsgebied, of breid de corpusdekking uit."
        ),
        "question": question,
        "source_ids": [],
        "citations": [_citation(hit) for hit in hits[:5]],
        "tool_trace": tool_trace,
    }


def _extractive_answer(question: str, hits: list[dict]) -> str:
    lines = [
        "Op basis van de beschikbare Veridicta-bronnen:",
        "",
    ]
    for index, hit in enumerate(hits[:4], start=1):
        label = _source_label(hit)
        article = hit.get("article")
        heading = hit.get("title") or hit.get("subject") or label
        snippet = compact_text(hit.get("text") or "")[:520]
        prefix = f"{index}. {heading}"
        if article:
            prefix = f"{prefix}, artikel {article}"
        lines.append(f"{prefix}: {snippet} [{label}]")
    lines.extend(
        [
            "",
            "Dit is geen juridisch advies; controleer de geciteerde bron voordat je deze toepast.",
        ]
    )
    return "\n".join(lines)


def _llm_answer(question: str, hits: list[dict]) -> str:
    from agents import Agent, Runner
    import asyncio

    context_blocks = []
    allowed_labels = []
    for hit in hits[:8]:
        label = _source_label(hit)
        allowed_labels.append(label)
        context_blocks.append(
            "\n".join(
                [
                    f"Citation label: {label}",
                    f"Title: {hit.get('title')}",
                    f"Source type: {hit.get('source_type')}",
                    f"Domain: {hit.get('domain')}",
                    f"Article: {hit.get('article')}",
                    f"Section: {hit.get('section')}",
                    f"Court: {hit.get('court')}",
                    f"Decision date: {hit.get('decision_date')}",
                    f"Text: {hit.get('text')}",
                ]
            )
        )

    instructions = (
        "You are Veridicta, a Dutch legal research assistant. Answer only from the provided sources. "
        "Every legal claim must include an inline citation using one of the provided citation labels in square brackets. "
        "If the provided sources do not support the answer, refuse briefly in Dutch."
    )
    prompt = (
        f"Question:\n{question}\n\n"
        f"Allowed citation labels: {', '.join(allowed_labels)}\n\n"
        f"Sources:\n\n{chr(10).join(context_blocks)}\n\n"
        "Answer in Dutch, concise and source-grounded."
    )
    agent = Agent(name="GroundedLegalAnswerAgent", instructions=instructions, model=DEFAULT_CHAT_MODEL)
    result = asyncio.run(Runner.run(agent, prompt))
    return str(result.final_output)


def generate_answer(question: str, collected_hits: list[dict]) -> dict:
    """Return a cited answer or a refusal when supporting sources are missing."""
    hits = _deduplicate_hits(collected_hits)
    if len(hits) < MIN_GROUNDED_SOURCES:
        return _refusal(question, hits, [])

    if os.getenv("OPENAI_API_KEY"):
        answer = _llm_answer(question, hits)
    else:
        answer = _extractive_answer(question, hits)

    cited_labels = {_source_label(hit) for hit in hits}
    if not any(f"[{label}]" in answer for label in cited_labels):
        answer = f"{answer}\n\nBronnen: " + ", ".join(f"[{label}]" for label in sorted(cited_labels)[:4])

    return {
        "status": "grounded",
        "answer": answer,
        "question": question,
        "source_ids": [hit.get("id") for hit in hits if hit.get("id")],
        "citations": [_citation(hit) for hit in hits[:8]],
    }


def chat(question: str, max_iterations: int = 2, domain: str | None = None) -> dict:
    """Run a minimal source-backed assistant lookup."""
    tool_trace: list[dict] = []

    exact_identifier = next(
        (part.strip(".,;:()[]") for part in question.split() if part.startswith(("ECLI:", "BWBR"))),
        None,
    )
    if exact_identifier:
        result = CiteLookupTool().run(identifier=exact_identifier, domain=domain)
        tool_trace.append({"tool": "cite_lookup", "input": {"identifier": exact_identifier, "domain": domain}})
        hits = result.get("hits", [])
    else:
        limit = max(3, min(8, max_iterations * 4))
        result = KnowledgeLookupTool().run(query=question, domain=domain, limit=limit)
        tool_trace.append({"tool": "knowledge_lookup", "input": {"query": question, "domain": domain, "limit": limit}})
        hits = result.get("hits", [])

    final = generate_answer(question, hits)
    final["tool_trace"] = tool_trace
    if final["status"] == "insufficient_sources":
        final["tool_trace"] = tool_trace
    LOGGER.info("assistant status=%s sources=%s", final["status"], len(final.get("citations", [])))
    return final


if __name__ == "__main__":
    example_question = "Wat is de opzegtermijn bij huur van woonruimte?"
    result = chat(example_question)
    print(result["answer"])
