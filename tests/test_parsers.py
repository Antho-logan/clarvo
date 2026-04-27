"""Tests for BWB and Rechtspraak XML parsers and shared helpers."""

from __future__ import annotations

import pytest
from datetime import date
from xml.etree import ElementTree as ET

from parsers._xml import all_texts, first_text, iter_nodes, local_name
from parsers.bwb_parser import LawDocument, parse_law_xml
from parsers.rechtspraak_parser import JudgmentDocument, parse_judgment_xml


BWB_XML_WITH_LIDS = b"""<?xml version="1.0" encoding="UTF-8"?>
<toestand xmlns="http://schemas.overheid.nl/wetgeving">
  <intitule>Wet op de arbeidsovereenkomst</intitule>
  <citeertitel>Arbeidsrecht</citeertitel>
  <artikel>
    <kop>
      <nr>7:611</nr>
      <opschrift>Goed werkgeverschap</opschrift>
    </kop>
    <lid>
      <lidnr>1</lidnr>
      <al>De werkgever en werknemer moeten zich gedragen als goed werkgever.</al>
    </lid>
    <lid>
      <lidnr>2</lidnr>
      <al>Dit geldt bij de uitvoering van de arbeidsovereenkomst.</al>
    </lid>
  </artikel>
  <artikel>
    <kop>
      <nr>7:612</nr>
    </kop>
    <al>Vrijetekst zonder lid.</al>
  </artikel>
</toestand>
"""


BWB_XML_WITHOUT_ARTICLES = b"""<?xml version="1.0" encoding="UTF-8"?>
<toestand xmlns="http://schemas.overheid.nl/wetgeving">
  <intitule>Fallback wet</intitule>
  <hoofdstuk>
    <al>Alleen losse paragraaf tekst.</al>
  </hoofdstuk>
</toestand>
"""


RECHTSPRAAK_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:dcterms="http://purl.org/dc/terms/"
         xmlns:psi="http://psi.rechtspraak.nl/">
  <rdf:Description>
    <dcterms:identifier>ECLI:NL:HR:2024:123</dcterms:identifier>
    <dcterms:creator>Hoge Raad</dcterms:creator>
    <dcterms:date>2024-06-15</dcterms:date>
    <dcterms:subject>Arbeidsrecht</dcterms:subject>
    <dcterms:subject>Opzegging</dcterms:subject>
    <uitspraak>
      <para>De werkgever heeft de opzegging niet rechtsgeldig gedaan.</para>
      <para>Het beroep is gegrond.</para>
    </uitspraak>
  </rdf:Description>
</rdf:RDF>
"""


RECHTSPRAAK_XML_NO_PARAS = b"""<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:dcterms="http://purl.org/dc/terms/">
  <rdf:Description>
    <dcterms:identifier>ECLI:NL:RBAMS:2023:99</dcterms:identifier>
    <dcterms:creator>Rechtbank Amsterdam</dcterms:creator>
  </rdf:Description>
</rdf:RDF>
"""


RECHTSPRAAK_XML_MISSING_ECLI = b"""<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:dcterms="http://purl.org/dc/terms/">
  <rdf:Description>
    <dcterms:identifier>not-an-ecli</dcterms:identifier>
  </rdf:Description>
</rdf:RDF>
"""


def test_local_name_strips_namespace() -> None:
    assert local_name("{http://example.com/ns}Artikel") == "artikel"
    assert local_name("plain") == "plain"


def test_iter_nodes_returns_matching_descendants() -> None:
    root = ET.fromstring(BWB_XML_WITH_LIDS)
    articles = list(iter_nodes(root, "artikel"))
    assert len(articles) == 2


def test_first_text_returns_first_match_with_prefix() -> None:
    root = ET.fromstring(RECHTSPRAAK_XML)
    assert first_text(root, ("identifier",), startswith="ECLI:") == "ECLI:NL:HR:2024:123"
    assert first_text(root, ("identifier",), startswith="XYZ") is None
    assert first_text(None, ("anything",)) is None


def test_first_text_returns_none_when_all_empty() -> None:
    root = ET.fromstring(b"<root><a></a><a></a></root>")
    assert first_text(root, ("a",)) is None


def test_all_texts_collects_paragraphs_in_order() -> None:
    root = ET.fromstring(BWB_XML_WITH_LIDS)
    lid_node = next(iter_nodes(root, "lid"))
    assert all_texts(lid_node, "al") == [
        "De werkgever en werknemer moeten zich gedragen als goed werkgever."
    ]


def test_parse_law_xml_extracts_lids_and_fallback() -> None:
    document = parse_law_xml("BWBR0012345", BWB_XML_WITH_LIDS)
    assert isinstance(document, LawDocument)
    assert document.title == "Wet op de arbeidsovereenkomst"
    assert document.bwbr_id == "BWBR0012345"
    assert document.source_type == "legislation"
    assert document.source_system == "bwb"
    articles = document.articles
    assert len(articles) == 3
    assert articles[0].article_number == "7:611"
    assert articles[0].section_number == "1"
    assert articles[0].article_title == "Goed werkgeverschap"
    assert articles[2].article_number == "7:612"
    assert articles[2].section_number is None
    assert "Vrijetekst zonder lid." in articles[2].text
    assert document.metadata["article_count"] == 3
    assert document.metadata["root_tag"] == "toestand"
    assert "Wet op de arbeidsovereenkomst" in document.raw_xml


def test_parse_law_xml_uses_root_fallback_when_no_articles() -> None:
    document = parse_law_xml("BWBR0099999", BWB_XML_WITHOUT_ARTICLES)
    assert len(document.articles) == 1
    assert document.articles[0].article_number is None
    assert "Alleen losse paragraaf tekst." in document.articles[0].text


def test_parse_law_xml_handles_multiple_lids() -> None:
    xml = (
        b"<toestand xmlns=\"x\"><artikel><kop><nr>5</nr></kop>"
        b"<lid><lidnr>1</lidnr><al>Eerste lid.</al></lid>"
        b"<lid><lidnr>2</lidnr><al>Tweede lid.</al></lid>"
        b"</artikel></toestand>"
    )
    document = parse_law_xml("BWBR0000001", xml)
    assert [article.section_number for article in document.articles] == ["1", "2"]
    assert "Eerste lid." in document.articles[0].text
    assert "Tweede lid." in document.articles[1].text


def test_parse_judgment_xml_returns_all_fields() -> None:
    judgment = parse_judgment_xml(RECHTSPRAAK_XML)
    assert isinstance(judgment, JudgmentDocument)
    assert judgment.ecli == "ECLI:NL:HR:2024:123"
    assert judgment.court == "Hoge Raad"
    assert judgment.decision_date == date(2024, 6, 15)
    assert judgment.subject == "Arbeidsrecht; Opzegging"
    assert "opzegging" in judgment.text.lower()
    assert judgment.metadata["body_paragraph_count"] == 2
    assert judgment.source_type == "case_law"
    assert judgment.source_system == "rechtspraak"


def test_parse_judgment_xml_falls_back_when_no_paragraphs() -> None:
    judgment = parse_judgment_xml(RECHTSPRAAK_XML_NO_PARAS)
    assert judgment.ecli == "ECLI:NL:RBAMS:2023:99"
    assert judgment.decision_date is None
    assert judgment.subject is None
    assert "Rechtbank Amsterdam" in judgment.text
    assert judgment.metadata["body_paragraph_count"] == 0


def test_parse_judgment_xml_raises_on_missing_ecli() -> None:
    with pytest.raises(ValueError, match="ECLI"):
        parse_judgment_xml(RECHTSPRAAK_XML_MISSING_ECLI)
