"""Deterministic parser for BWB law XML."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional
from xml.etree import ElementTree as ET

from backend_common import compact_text
from parsers._xml import all_texts, first_text, iter_nodes, local_name


@dataclass
class LawArticle:
    """Normalized legislation record at article/lid granularity."""

    article_number: Optional[str]
    section_number: Optional[str]
    text: str
    article_title: Optional[str] = None


@dataclass
class LawDocument:
    """Parsed legislation document with raw XML and normalized article chunks."""

    source_type: str
    source_system: str
    bwbr_id: str
    title: Optional[str]
    raw_xml: str
    articles: list[LawArticle]
    metadata: dict[str, Any]


def _fallback_article_text(article_node: ET.Element) -> str:
    """Collect the best available fallback article text when lid/al is absent."""
    paragraph_texts = all_texts(article_node, "al")
    if paragraph_texts:
        return compact_text(" ".join(paragraph_texts))

    raw_text = compact_text(" ".join(article_node.itertext()))
    if raw_text:
        return raw_text
    return ""


def parse_law_xml(bwbr_id: str, xml_bytes: bytes) -> LawDocument:
    """Parse one toestand XML payload into normalized legislation records."""
    root = ET.fromstring(xml_bytes)
    title = first_text(root, ("intitule",)) or first_text(root, ("citeertitel",))
    articles: list[LawArticle] = []

    for article_node in iter_nodes(root, "artikel"):
        header = next(
            (child for child in article_node if local_name(child.tag) == "kop"), None
        )
        article_number = first_text(header, ("nr",)) if header is not None else None
        article_title = (
            first_text(header, ("opschrift", "titel", "tussenkop"))
            if header is not None
            else None
        )

        direct_lids = [
            child for child in article_node if local_name(child.tag) == "lid"
        ]
        lid_nodes = direct_lids or [child for child in iter_nodes(article_node, "lid")]
        if lid_nodes:
            for lid_node in lid_nodes:
                section_number = first_text(lid_node, ("lidnr",))
                paragraph_texts = all_texts(lid_node, "al")
                section_text = (
                    compact_text(" ".join(paragraph_texts))
                    if paragraph_texts
                    else _fallback_article_text(lid_node)
                )
                if not section_text:
                    continue
                articles.append(
                    LawArticle(
                        article_number=article_number,
                        section_number=section_number,
                        text=section_text,
                        article_title=article_title,
                    )
                )
            continue

        fallback_text = _fallback_article_text(article_node)
        if fallback_text:
            articles.append(
                LawArticle(
                    article_number=article_number,
                    section_number=None,
                    text=fallback_text,
                    article_title=article_title,
                )
            )

    if not articles:
        fallback_text = compact_text(" ".join(root.itertext()))
        if fallback_text:
            articles.append(
                LawArticle(
                    article_number=None,
                    section_number=None,
                    text=fallback_text,
                    article_title=None,
                )
            )

    return LawDocument(
        source_type="legislation",
        source_system="bwb",
        bwbr_id=bwbr_id,
        title=title,
        raw_xml=xml_bytes.decode("utf-8", errors="replace"),
        articles=articles,
        metadata={
            "article_count": len(articles),
            "root_tag": local_name(root.tag),
        },
    )
