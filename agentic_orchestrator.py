"""Grounded assistant flow for Clarvo.

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
MAX_LLM_SOURCES = 6
MAX_CONTEXT_CHARS_PER_SOURCE = 1400
MAX_EXTRACTIVE_SNIPPET_CHARS = 520
MAX_HISTORY_MESSAGES = 8
MAX_HISTORY_CHARS_PER_MESSAGE = 1200
MAX_CLIENT_DOCUMENTS = 3
MAX_CLIENT_DOCUMENT_CHARS = 30000
MAX_CLIENT_DOCUMENT_PARAGRAPHS = 60
MAX_CLIENT_DOCUMENT_PARAGRAPH_CHARS = 900
MAX_CONTRACT_REVIEW_QUERIES = 5
UNSUPPORTED_QUESTION_PATTERNS = (
    "belastingaangifte",
    "deutschen arbeitsrecht",
    "deutsches arbeitsrecht",
    "deutscher arbeitsrecht",
    "deutsche arbeitsrecht",
    "deutschem arbeitsrecht",
    "deutsches recht",
    "deutschen recht",
    "duits recht",
    "duits arbeidsrecht",
    "duitse arbeidsrecht",
    "german law",
    "german labor law",
    "german labour law",
    "german employment law",
    "strafrecht",
    "voorlopige hechtenis",
    "advocaat vervangen",
    "vervangt mijn advocaat",
    "mijn advocaat vervangen",
)
CONTRACT_REVIEW_QUESTION_PATTERNS = (
    "algemene bepalingen",
    "contract",
    "huurovereenkomst",
    "overeenkomst",
    "bepaling",
    "clausule",
    "pdf",
    "beoordeel",
    "controleer",
    "check",
    "review",
    "niet klopt",
    "niet kloppen",
    "niet correct",
    "niet volgens de wet",
    "following the law",
    "risico",
)
TENANCY_CONTRACT_QUERY_RULES = (
    (
        (
            "onderhoud",
            "herstel",
            "hersteld",
            "gebrek",
            "gebreken",
            "schade",
            "slijtage",
        ),
        "huur gebreken onderhoud kleine herstellingen normale slijtage",
    ),
    (
        ("opzeg", "opzegging", "opzegtermijn", "beëindiging", "beeindiging"),
        "huur woonruimte opzegging wettelijke eisen opzegtermijn",
    ),
    (
        ("borg", "waarborgsom", "deposit"),
        "huur waarborgsom terugbetaling schadevergoeding",
    ),
    (
        ("boete", "boetebeding", "contractuele boete"),
        "huur boetebeding contractuele boete redelijkheid",
    ),
    (
        ("oplever", "eindinspectie", "inspectie"),
        "oplevering huurwoning schade normale slijtage",
    ),
    (
        ("huurbescherming", "bescherming", "ontruiming"),
        "huur woonruimte huurbescherming ontruiming wettelijke regels",
    ),
)
TENANCY_CONTRACT_DEFAULT_QUERIES = (
    "huur gebreken onderhoud kleine herstellingen normale slijtage",
    "huur woonruimte opzegging wettelijke eisen opzegtermijn",
    "huur waarborgsom terugbetaling schadevergoeding",
)


def _source_label(hit: dict) -> str:
    return str(
        hit.get("source_id") or hit.get("ecli") or hit.get("bwbr_id") or hit.get("id")
    )


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


def _is_unsupported_question(question: str) -> bool:
    normalized = compact_text(question).lower()
    return any(pattern in normalized for pattern in UNSUPPORTED_QUESTION_PATTERNS)


def _is_refusal_answer(answer: str) -> bool:
    normalized = compact_text(answer).lower()
    refusal_markers = (
        "kan deze vraag niet betrouwbaar beantwoorden",
        "kan ik deze vraag niet betrouwbaar beantwoorden",
        "bronnen bevatten geen informatie",
        "onvoldoende bronnen",
        "niet ondersteund door de verstrekte bronnen",
        "niet beantwoorden op basis van de verstrekte bronnen",
        "niet betrouwbaar beantwoorden met de huidige opgeslagen bronnen",
    )
    return any(marker in normalized for marker in refusal_markers)


def _refusal(question: str, hits: list[dict], tool_trace: list[dict]) -> dict:
    return {
        "status": "insufficient_sources",
        "answer": (
            "Ik kan deze vraag niet betrouwbaar beantwoorden met de huidige opgeslagen bronnen. "
            "Verbreed de zoekvraag, kies een ander rechtsgebied, of breid de corpusdekking uit."
        ),
        "question": question,
        "source_ids": [],
        "citations": [],
        "tool_trace": tool_trace,
    }


def _extractive_answer(question: str, hits: list[dict]) -> str:
    lines = [
        "Op basis van de beschikbare Clarvo-bronnen:",
        "",
    ]
    for index, hit in enumerate(hits[:4], start=1):
        label = _source_label(hit)
        article = hit.get("article")
        heading = hit.get("title") or hit.get("subject") or label
        snippet = compact_text(hit.get("text") or "")[:MAX_EXTRACTIVE_SNIPPET_CHARS]
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


def _format_conversation_history(conversation_history: list[dict] | None) -> str:
    if not conversation_history:
        return ""

    lines = ["Recent conversation:"]
    for message in conversation_history[-MAX_HISTORY_MESSAGES:]:
        role = str(message.get("role") or "").strip().lower()
        if role not in {"user", "assistant"}:
            continue
        content = compact_text(message.get("content") or "")[
            :MAX_HISTORY_CHARS_PER_MESSAGE
        ]
        if not content:
            continue
        lines.append(f"- {role.title()}: {content}")

    return "\n".join(lines) if len(lines) > 1 else ""


def _format_client_documents(client_documents: list[dict] | None) -> str:
    if not client_documents:
        return ""

    blocks = ["Client-provided documents:"]
    for index, document in enumerate(client_documents[:MAX_CLIENT_DOCUMENTS], start=1):
        name = compact_text(document.get("name") or f"Document {index}")[:160]
        raw_text = str(document.get("text") or "")[:MAX_CLIENT_DOCUMENT_CHARS]
        paragraphs = _client_document_paragraphs(raw_text)
        if not paragraphs:
            continue
        paragraph_lines = [
            f"[Contract D{index}.P{paragraph_index}] {paragraph}"
            for paragraph_index, paragraph in enumerate(paragraphs, start=1)
        ]
        blocks.append(
            "\n".join(
                [
                    f"Document D{index}: {name}",
                    "Contract passages:",
                    *paragraph_lines,
                ]
            )
        )

    return "\n\n".join(blocks) if len(blocks) > 1 else ""


def _client_document_paragraphs(text: str) -> list[str]:
    raw_lines = [compact_text(line) for line in text.splitlines()]
    paragraphs = [line for line in raw_lines if line]
    if len(paragraphs) <= 1:
        paragraphs = _split_long_contract_line(compact_text(text))

    return [
        paragraph[:MAX_CLIENT_DOCUMENT_PARAGRAPH_CHARS]
        for paragraph in paragraphs[:MAX_CLIENT_DOCUMENT_PARAGRAPHS]
        if paragraph
    ]


def _split_long_contract_line(text: str) -> list[str]:
    if not text:
        return []
    if len(text) <= MAX_CLIENT_DOCUMENT_PARAGRAPH_CHARS:
        return [text]

    paragraphs: list[str] = []
    current = ""
    for sentence in text.replace("; ", ". ").split(". "):
        sentence = sentence.strip()
        if not sentence:
            continue
        sentence = sentence if sentence.endswith(".") else f"{sentence}."
        if (
            current
            and len(f"{current} {sentence}") > MAX_CLIENT_DOCUMENT_PARAGRAPH_CHARS
        ):
            paragraphs.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        paragraphs.append(current)
    return paragraphs or [text[:MAX_CLIENT_DOCUMENT_PARAGRAPH_CHARS]]


def _client_document_search_text(client_documents: list[dict] | None) -> str:
    if not client_documents:
        return ""

    parts: list[str] = []
    for document in client_documents[:MAX_CLIENT_DOCUMENTS]:
        parts.append(str(document.get("name") or ""))
        parts.append(str(document.get("text") or "")[:MAX_CLIENT_DOCUMENT_CHARS])
    return compact_text(" ".join(parts)).lower()


def _looks_like_contract_review(
    question: str, client_documents: list[dict] | None
) -> bool:
    if not client_documents:
        return False
    combined = f"{compact_text(question).lower()} {_client_document_search_text(client_documents)}"
    return any(pattern in combined for pattern in CONTRACT_REVIEW_QUESTION_PATTERNS)


def _contract_review_queries(
    question: str,
    client_documents: list[dict] | None,
    domain: str | None = None,
) -> list[str]:
    if not _looks_like_contract_review(question, client_documents):
        return []

    combined = f"{compact_text(question).lower()} {_client_document_search_text(client_documents)}"
    queries: list[str] = []

    if domain in {None, "", "tenancy_law"}:
        queries.extend(TENANCY_CONTRACT_DEFAULT_QUERIES)
        for markers, query in TENANCY_CONTRACT_QUERY_RULES:
            if any(marker in combined for marker in markers):
                queries.append(query)

    deduped: list[str] = []
    for query in queries:
        if query not in deduped:
            deduped.append(query)
    return deduped[:MAX_CONTRACT_REVIEW_QUERIES]


def _llm_answer(
    question: str,
    hits: list[dict],
    conversation_history: list[dict] | None = None,
    client_documents: list[dict] | None = None,
    response_language: str = "nl",
) -> str:
    from agents import Agent, Runner
    import asyncio

    context_blocks = []
    allowed_labels = []
    for hit in hits[:MAX_LLM_SOURCES]:
        label = _source_label(hit)
        allowed_labels.append(label)
        source_text = compact_text(hit.get("text") or "")[:MAX_CONTEXT_CHARS_PER_SOURCE]
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
                    f"Text: {source_text}",
                ]
            )
        )

    history_context = _format_conversation_history(conversation_history)
    document_context = _format_client_documents(client_documents)
    optional_context = "\n\n".join(
        block for block in (history_context, document_context) if block
    )

    if response_language == "en":
        answer_language = "English"
        ordinary_headings = (
            "Brief conclusion, Legal framework, Application to the situation, "
            "Important exceptions / points of attention, Sources / citations, Practical next step, "
            "Lawyer review required"
        )
        contract_headings = (
            "Brief conclusion, Contract passage, Legal rule, Risk, Recommendation, "
            "Sources/citations, Lawyer review required"
        )
        language_rule = "Answer in English."
    else:
        answer_language = "Dutch"
        ordinary_headings = (
            "Korte conclusie, Juridisch kader, Toepassing op de situatie, "
            "Belangrijke uitzonderingen / aandachtspunten, Bronnen / citaties, "
            "Praktische vervolgstap, and Juristencontrole vereist"
        )
        contract_headings = (
            "Korte conclusie, Contractpassage, Juridische regel, Risico, Aanbeveling, "
            "Bronnen/citaties, and Juristencontrole vereist"
        )
        language_rule = "Answer in Dutch."

    instructions = (
        "You are Clarvo, a Dutch legal research assistant. Answer only from the provided Dutch legal sources "
        "and any client-provided document text. Treat client documents as user-provided facts or contract text, "
        "not as legal authority. Every legal claim must include an inline citation using one of the provided "
        "citation labels in square brackets. Contract observations may reference the document name, but legal "
        "rules still require a legal-source citation. For ordinary Dutch legal research answers in the supported "
        f"huurrecht and arbeidsrecht domains, answer in {answer_language} and use these exact compact headings: "
        f"{ordinary_headings}. Keep the answer practical, distinguish the legal "
        "rule from its application, and name important caveats when the sources support them. When reviewing a "
        f"contract, write like a senior Dutch jurist, answer in {answer_language}, and use these exact compact headings: "
        f"{contract_headings}. "
        "Cite the exact Contractpassage using labels like [Contract D1.P2], and cite legal sources inline for every legal rule. "
        "If the provided sources do not support a legal conclusion, say that specific point is not supported "
        f"instead of guessing. {language_rule}"
    )
    prompt = (
        f"Question:\n{question}\n\n"
        f"{optional_context}\n\n"
        f"Allowed citation labels: {', '.join(allowed_labels)}\n\n"
        f"Sources:\n\n{chr(10).join(context_blocks)}\n\n"
        f"{language_rule} For ordinary Dutch legal research answers in huurrecht or arbeidsrecht, use these exact "
        f"compact headings: {ordinary_headings}. For contract checks, use these exact compact headings: "
        f"{contract_headings}."
    )
    agent = Agent(
        name="GroundedLegalAnswerAgent",
        instructions=instructions,
        model=DEFAULT_CHAT_MODEL,
    )
    result = asyncio.run(Runner.run(agent, prompt))
    return str(result.final_output)


def generate_answer(
    question: str,
    collected_hits: list[dict],
    conversation_history: list[dict] | None = None,
    client_documents: list[dict] | None = None,
    response_language: str = "nl",
) -> dict:
    """Return a cited answer or a refusal when supporting sources are missing."""
    hits = _deduplicate_hits(collected_hits)
    if len(hits) < MIN_GROUNDED_SOURCES:
        return _refusal(question, hits, [])
    if os.getenv("OPENAI_API_KEY"):
        answer = _llm_answer(
            question,
            hits,
            conversation_history=conversation_history,
            client_documents=client_documents,
            response_language=response_language,
        )
    else:
        answer = _extractive_answer(question, hits)

    if _is_refusal_answer(answer):
        return _refusal(question, [], [])

    cited_labels = {_source_label(hit) for hit in hits}
    if not any(f"[{label}]" in answer for label in cited_labels):
        answer = f"{answer}\n\nBronnen: " + ", ".join(
            f"[{label}]" for label in sorted(cited_labels)[:4]
        )

    return {
        "status": "grounded",
        "answer": answer,
        "question": question,
        "source_ids": [hit.get("id") for hit in hits if hit.get("id")],
        "citations": [_citation(hit) for hit in hits[:8]],
    }


def chat(
    question: str,
    max_iterations: int = 2,
    domain: str | None = None,
    response_language: str = "nl",
    conversation_history: list[dict] | None = None,
    client_documents: list[dict] | None = None,
) -> dict:
    """Run a minimal source-backed assistant lookup."""
    tool_trace: list[dict] = []

    if _is_unsupported_question(question):
        final = _refusal(question, [], tool_trace)
        LOGGER.info(
            "assistant status=%s sources=%s",
            final["status"],
            len(final.get("citations", [])),
        )
        return final

    exact_identifier = next(
        (
            part.strip(".,;:()[]")
            for part in question.split()
            if part.startswith(("ECLI:", "BWBR"))
        ),
        None,
    )
    if exact_identifier:
        result = CiteLookupTool().run(identifier=exact_identifier, domain=domain)
        tool_trace.append(
            {
                "tool": "cite_lookup",
                "input": {"identifier": exact_identifier, "domain": domain},
            }
        )
        hits = result.get("hits", [])
    else:
        limit = max(3, min(8, max_iterations * 4))
        knowledge_tool = KnowledgeLookupTool()
        result = knowledge_tool.run(query=question, domain=domain, limit=limit)
        tool_trace.append(
            {
                "tool": "knowledge_lookup",
                "input": {"query": question, "domain": domain, "limit": limit},
            }
        )
        hits = result.get("hits", [])
        for review_query in _contract_review_queries(
            question, client_documents, domain=domain
        ):
            review_limit = max(2, min(4, limit))
            review_result = knowledge_tool.run(
                query=review_query, domain=domain, limit=review_limit
            )
            tool_trace.append(
                {
                    "tool": "knowledge_lookup",
                    "input": {
                        "query": review_query,
                        "domain": domain,
                        "limit": review_limit,
                        "reason": "client_document_contract_review",
                    },
                }
            )
            hits.extend(review_result.get("hits", []))

    final = generate_answer(
        question,
        hits,
        conversation_history=conversation_history,
        client_documents=client_documents,
        response_language=(
            response_language if response_language in {"nl", "en"} else "nl"
        ),
    )
    final["tool_trace"] = tool_trace
    if final["status"] == "insufficient_sources":
        final["tool_trace"] = tool_trace
    LOGGER.info(
        "assistant status=%s sources=%s",
        final["status"],
        len(final.get("citations", [])),
    )
    return final


if __name__ == "__main__":
    example_question = "Wat is de opzegtermijn bij huur van woonruimte?"
    result = chat(example_question)
    print(result["answer"])
