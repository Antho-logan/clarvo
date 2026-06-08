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


def test_contract_review_uses_uploaded_document_for_targeted_legal_search(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    queries: list[str] = []

    class FakeKnowledgeLookupTool:
        def run(self, **kwargs):
            query = str(kwargs["query"])
            queries.append(query)
            if "kleine herstellingen" in query:
                return {
                    "hits": [
                        {
                            "id": "doc-contract-review",
                            "source_id": "BWBR-HUUR-ONDERHOUD",
                            "source_type": "legislation",
                            "domain": "tenancy_law",
                            "title": "Huurrecht onderhoud",
                            "article": "7:217",
                            "text": (
                                "De huurder verricht kleine herstellingen. "
                                "Normale slijtage en grotere gebreken komen niet zonder meer voor rekening van de huurder."
                            ),
                        }
                    ]
                }
            return {"hits": []}

    monkeypatch.setattr(
        agentic_orchestrator,
        "KnowledgeLookupTool",
        FakeKnowledgeLookupTool,
    )

    result = chat(
        "Kun je deze Algemene Bepalingen PDF controleren op bepalingen die niet kloppen met de wet?",
        domain="tenancy_law",
        client_documents=[
            {
                "name": "Algemene Bepalingen.pdf",
                "text": (
                    "Huurder betaalt alle onderhoud, alle gebreken, schade en slijtage, "
                    "ook wanneer het gehuurde oud is."
                ),
            }
        ],
    )

    assert result["status"] == "grounded"
    assert result["citations"][0]["source_id"] == "BWBR-HUUR-ONDERHOUD"
    assert len(queries) > 1
    assert any("kleine herstellingen" in query for query in queries)


def test_generated_refusal_is_not_marked_grounded(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(
        agentic_orchestrator,
        "_llm_answer",
        lambda question, hits, **kwargs: "De verstrekte bronnen bevatten geen informatie over deze vraag.",
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


def test_llm_answer_includes_chat_history_and_uploaded_documents(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str] = {}

    class FakeAgent:
        def __init__(self, **kwargs):
            captured["instructions"] = kwargs["instructions"]

    class FakeRunner:
        @staticmethod
        async def run(agent, prompt):
            captured["prompt"] = prompt
            return types.SimpleNamespace(final_output="Antwoord [BWBR-LAW]")

    monkeypatch.setitem(
        sys.modules,
        "agents",
        types.SimpleNamespace(Agent=FakeAgent, Runner=FakeRunner),
    )

    answer = agentic_orchestrator._llm_answer(
        "Wat betekent dit voor mijn contract?",
        [
            {
                "source_id": "BWBR-LAW",
                "source_type": "legislation",
                "domain": "tenancy_law",
                "title": "Huurrecht bron",
                "article": "7:271",
                "text": "Wettelijke opzegregels.",
            }
        ],
        conversation_history=[
            {
                "role": "user",
                "content": "Ik heb een contract met een opzegtermijn.",
            },
            {
                "role": "assistant",
                "content": "Upload de relevante contracttekst.",
            },
        ],
        client_documents=[
            {
                "name": "huurcontract.txt",
                "text": (
                    "Contractuele opzegtermijn: twee maanden.\n"
                    "Huurder mag geen beroep doen op wettelijke huurbescherming."
                ),
            }
        ],
    )

    assert answer == "Antwoord [BWBR-LAW]"
    assert "Recent conversation:" in captured["prompt"]
    assert "Ik heb een contract met een opzegtermijn." in captured["prompt"]
    assert "Client-provided documents:" in captured["prompt"]
    assert "huurcontract.txt" in captured["prompt"]
    assert (
        "[Contract D1.P1] Contractuele opzegtermijn: twee maanden."
        in captured["prompt"]
    )
    assert (
        "[Contract D1.P2] Huurder mag geen beroep doen op wettelijke huurbescherming."
        in captured["prompt"]
    )
    assert "Korte conclusie" in captured["instructions"]
    assert "Contractpassage" in captured["instructions"]
    assert "Juridische regel" in captured["instructions"]
    assert "Risico" in captured["instructions"]
    assert "Aanbeveling" in captured["instructions"]
    assert "Bronnen/citaties" in captured["instructions"]
    assert "Juristencontrole vereist" in captured["instructions"]
    assert "Korte conclusie" in captured["prompt"]
    assert "Juristencontrole vereist" in captured["prompt"]


def test_llm_answer_instructs_normal_legal_research_structure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str] = {}

    class FakeAgent:
        def __init__(self, **kwargs):
            captured["instructions"] = kwargs["instructions"]

    class FakeRunner:
        @staticmethod
        async def run(agent, prompt):
            captured["prompt"] = prompt
            return types.SimpleNamespace(final_output="Antwoord [BWBR-LAW]")

    monkeypatch.setitem(
        sys.modules,
        "agents",
        types.SimpleNamespace(Agent=FakeAgent, Runner=FakeRunner),
    )

    answer = agentic_orchestrator._llm_answer(
        "Wat geldt bij opzegging van huur van woonruimte?",
        [
            {
                "source_id": "BWBR-LAW",
                "source_type": "legislation",
                "domain": "tenancy_law",
                "title": "Huurrecht bron",
                "article": "7:271",
                "text": "Wettelijke opzegregels.",
            }
        ],
    )

    assert answer == "Antwoord [BWBR-LAW]"
    assert "Korte conclusie" in captured["instructions"]
    assert "Juridisch kader" in captured["instructions"]
    assert "Toepassing op de situatie" in captured["instructions"]
    assert "Belangrijke uitzonderingen / aandachtspunten" in captured["instructions"]
    assert "Bronnen / citaties" in captured["instructions"]
    assert "Praktische vervolgstap" in captured["instructions"]
    assert "Juristencontrole vereist" in captured["instructions"]
    assert "huurrecht" in captured["instructions"]
    assert "arbeidsrecht" in captured["instructions"]
    assert "For ordinary Dutch legal research answers" in captured["prompt"]
    assert "Belangrijke uitzonderingen / aandachtspunten" in captured["prompt"]
    assert "Bronnen / citaties" in captured["prompt"]


def test_llm_answer_keeps_contract_review_structure_separate(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str] = {}

    class FakeAgent:
        def __init__(self, **kwargs):
            captured["instructions"] = kwargs["instructions"]

    class FakeRunner:
        @staticmethod
        async def run(agent, prompt):
            captured["prompt"] = prompt
            return types.SimpleNamespace(final_output="Contractantwoord [BWBR-LAW]")

    monkeypatch.setitem(
        sys.modules,
        "agents",
        types.SimpleNamespace(Agent=FakeAgent, Runner=FakeRunner),
    )

    answer = agentic_orchestrator._llm_answer(
        "Beoordeel deze bepaling voor een Nederlandse huurovereenkomst.",
        [
            {
                "source_id": "BWBR-LAW",
                "source_type": "legislation",
                "domain": "tenancy_law",
                "title": "Huurrecht bron",
                "article": "7:271",
                "text": "Wettelijke opzegregels.",
            }
        ],
        client_documents=[
            {
                "name": "huurclausule.txt",
                "text": "Verhuurder mag op elk moment opzeggen met een maand termijn.",
            }
        ],
    )

    assert answer == "Contractantwoord [BWBR-LAW]"
    assert "Contractpassage" in captured["instructions"]
    assert "Juridische regel" in captured["instructions"]
    assert "Risico" in captured["instructions"]
    assert "Aanbeveling" in captured["instructions"]
    assert "Bronnen/citaties" in captured["instructions"]
    assert "[Contract D1.P1]" in captured["prompt"]
    assert "Contractpassage" in captured["prompt"]
