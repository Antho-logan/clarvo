from __future__ import annotations

import sys
import types
import uuid
from datetime import date

import pytest

import agentic_orchestrator
from agentic_orchestrator import chat
from backend_common import Document


@pytest.mark.usefixtures("db_engine")
def test_assistant_refuses_without_sources(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    result = chat("Bestaat er een bron voor deze zeer specifieke niet bestaande vraag?")

    assert result["status"] == "insufficient_sources"
    assert result["source_ids"] == []
    assert result["citations"] == []


def test_assistant_refuses_unsupported_question_without_citations() -> None:
    result = chat("Geef advies over Duits arbeidsrecht.")

    assert result["status"] == "insufficient_sources"
    assert result["source_ids"] == []
    assert result["citations"] == []


def test_assistant_refuses_german_law_even_with_domain_selected() -> None:
    result = chat(
        "Welche Kündigungsfristen gelten im deutschen Arbeitsrecht für einen Arbeitnehmer mit fünf Jahren Betriebszugehörigkeit?",
        domain="employment_law",
    )

    assert result["status"] == "insufficient_sources"
    assert result["source_ids"] == []
    assert result["citations"] == []


def test_assistant_returns_citations_for_grounded_sources(
    db_session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    db_session.add(
        Document(
            id=uuid.uuid4(),
            document_type="law_article",
            source_type="legislation",
            source_system="bwb",
            source_id="BWBR-HUUR",
            domain="tenancy_law",
            bwbr_id="BWBR-HUUR",
            title="Huurrecht testbron",
            article="7:271",
            effective_from=date(1900, 1, 1),
            effective_to=date(9999, 12, 31),
            text="Opzegging van huur van woonruimte moet aan wettelijke eisen voldoen.",
        )
    )
    db_session.commit()

    result = chat("opzegging huur woonruimte", domain="tenancy_law")

    assert result["status"] == "grounded"
    assert result["citations"]
    assert "[BWBR-HUUR]" in result["answer"]


def test_generated_refusal_is_not_marked_grounded(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(
        agentic_orchestrator,
        "_llm_answer",
        lambda question, hits: "De verstrekte bronnen bevatten geen informatie over deze vraag.",
    )

    result = agentic_orchestrator.generate_answer(
        "Wat moet ik doen bij strafrechtelijke voorlopige hechtenis?",
        [
            {
                "id": "doc-1",
                "source_id": "BWBR-UNRELATED",
                "source_type": "legislation",
                "domain": "administrative_law",
                "text": "De bestuursrechter kan een voorlopige voorziening treffen.",
            }
        ],
    )

    assert result["status"] == "insufficient_sources"
    assert result["source_ids"] == []
    assert result["citations"] == []


def test_llm_answer_trims_long_source_text(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, str] = {}

    class FakeAgent:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    class FakeRunner:
        @staticmethod
        async def run(agent, prompt):
            captured["prompt"] = prompt
            return types.SimpleNamespace(final_output="Antwoord [BWBR-LONG]")

    monkeypatch.setitem(
        sys.modules,
        "agents",
        types.SimpleNamespace(Agent=FakeAgent, Runner=FakeRunner),
    )

    long_text = "start " + ("middle " * 5000) + "END_SHOULD_BE_TRIMMED"
    answer = agentic_orchestrator._llm_answer(
        "testvraag",
        [
            {
                "source_id": "BWBR-LONG",
                "source_type": "legislation",
                "domain": "tenancy_law",
                "title": "Lange bron",
                "article": "1",
                "text": long_text,
            }
        ],
    )

    assert answer == "Antwoord [BWBR-LONG]"
    assert "start middle" in captured["prompt"]
    assert "END_SHOULD_BE_TRIMMED" not in captured["prompt"]
