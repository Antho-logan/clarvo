from __future__ import annotations

import uuid
from datetime import date

import pytest

from agentic_orchestrator import chat
from backend_common import Document


@pytest.mark.usefixtures("db_engine")
def test_assistant_refuses_without_sources(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    result = chat("Bestaat er een bron voor deze zeer specifieke niet bestaande vraag?")

    assert result["status"] == "insufficient_sources"
    assert result["source_ids"] == []


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
