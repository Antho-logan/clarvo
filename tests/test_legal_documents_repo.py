"""Tests for repositories/legal_documents.py upsert and lookup helpers."""

from __future__ import annotations

from datetime import date, datetime, timezone

import pytest

from parsers.bwb_parser import LawArticle, LawDocument
from parsers.rechtspraak_parser import JudgmentDocument
from repositories.legal_documents import (
    count_documents_by_source_id,
    get_document_by_source_id,
    insert_judgment_document,
    insert_law_document,
    list_sample_documents,
)


def _build_law(articles: list[LawArticle]) -> LawDocument:
    return LawDocument(
        source_type="legislation",
        source_system="bwb",
        bwbr_id="BWBR0010000",
        title="Testwet",
        raw_xml="<toestand/>",
        articles=articles,
        metadata={"article_count": len(articles)},
    )


def _build_judgment(ecli: str = "ECLI:NL:HR:2024:1") -> JudgmentDocument:
    return JudgmentDocument(
        source_type="case_law",
        source_system="rechtspraak",
        ecli=ecli,
        court="Hoge Raad",
        decision_date=date(2024, 6, 1),
        subject="Arbeidsrecht",
        raw_xml="<rdf:RDF/>",
        text="De uitspraak gaat over opzegging.",
        metadata={"body_paragraph_count": 1},
    )


@pytest.mark.usefixtures("db_engine")
def test_insert_law_document_inserts_normalized_articles() -> None:
    articles = [
        LawArticle(article_number="1", section_number="1", text="Eerste lid.", article_title="Titel"),
        LawArticle(article_number="1", section_number="2", text="Tweede lid."),
    ]
    summary = insert_law_document(
        _build_law(articles),
        domain="employment_law",
        source_url="https://example/bwb/BWBR0010000",
        fetched_at=datetime.now(timezone.utc),
        fetch_metadata={"selected_start_date": "2024-01-01", "selected_end_date": "2099-12-31"},
    )
    assert summary.inserted == 2
    assert summary.updated == 0
    assert summary.total == 2

    stored = get_document_by_source_id("BWBR0010000", domain="employment_law")
    assert len(stored) == 2
    assert {document.section for document in stored} == {"1", "2"}
    assert stored[0].effective_from == date(2024, 1, 1)
    assert stored[0].effective_to == date(2099, 12, 31)
    # First anchor row should preserve the raw XML.
    anchor_rows = [document for document in stored if document.raw_xml]
    assert len(anchor_rows) == 1


@pytest.mark.usefixtures("db_engine")
def test_insert_law_document_merges_duplicate_articles_on_rerun() -> None:
    articles = [
        LawArticle(article_number="2", section_number=None, text="Oorspronkelijke tekst."),
    ]
    insert_law_document(_build_law(articles), source_url="https://example/bwb/1")

    updated_articles = [
        LawArticle(article_number="2", section_number=None, text="Geüpdatete tekst.", article_title="Nieuwe titel"),
    ]
    summary = insert_law_document(_build_law(updated_articles), source_url="https://example/bwb/1")
    assert summary.inserted == 0
    assert summary.updated == 1
    assert summary.total == 1

    stored = get_document_by_source_id("BWBR0010000")
    assert len(stored) == 1
    assert stored[0].text == "Geüpdatete tekst."
    assert stored[0].subject == "Nieuwe titel"


@pytest.mark.usefixtures("db_engine")
def test_insert_law_document_merges_duplicate_article_sections_in_payload() -> None:
    articles = [
        LawArticle(article_number="3", section_number="1", text="Alfa tekst.", article_title=None),
        LawArticle(article_number="3", section_number="1", text="Beta tekst.", article_title="Titel"),
    ]
    summary = insert_law_document(_build_law(articles), source_url="https://example/bwb/1")
    assert summary.total == 1

    stored = get_document_by_source_id("BWBR0010000")
    assert len(stored) == 1
    assert "Alfa tekst." in stored[0].text
    assert "Beta tekst." in stored[0].text
    assert stored[0].subject == "Titel"


@pytest.mark.usefixtures("db_engine")
def test_insert_judgment_document_inserts_and_updates() -> None:
    summary = insert_judgment_document(
        _build_judgment(),
        domain="employment_law",
        source_url="https://example/rechtspraak/1",
    )
    assert summary.inserted == 1
    assert summary.updated == 0

    # Second insert with the same ECLI should update, not insert.
    updated = insert_judgment_document(
        _build_judgment(),
        domain="employment_law",
        source_url="https://example/rechtspraak/1",
    )
    assert updated.inserted == 0
    assert updated.updated == 1

    stored = get_document_by_source_id("ECLI:NL:HR:2024:1", domain="employment_law")
    assert len(stored) == 1
    assert stored[0].court == "Hoge Raad"
    assert stored[0].decision_date == date(2024, 6, 1)


@pytest.mark.usefixtures("db_engine")
def test_count_documents_and_list_sample_documents_respect_filters() -> None:
    insert_judgment_document(_build_judgment("ECLI:NL:HR:2024:A"), source_url="u", domain="employment_law")
    insert_judgment_document(_build_judgment("ECLI:NL:HR:2024:B"), source_url="u", domain="tenancy_law")

    assert count_documents_by_source_id("ECLI:NL:HR:2024:A") == 1
    assert count_documents_by_source_id("ECLI:NL:HR:2024:A", domain="tenancy_law") == 0

    employment_sample = list_sample_documents(source_type="case_law", domain="employment_law")
    assert len(employment_sample) == 1
    assert employment_sample[0].ecli == "ECLI:NL:HR:2024:A"


def test_parse_optional_date_helper_handles_date_objects() -> None:
    from repositories.legal_documents import _parse_optional_date

    assert _parse_optional_date(None) is None
    assert _parse_optional_date("") is None
    assert _parse_optional_date("2024-05-01") == date(2024, 5, 1)
    assert _parse_optional_date(date(2024, 1, 1)) == date(2024, 1, 1)
