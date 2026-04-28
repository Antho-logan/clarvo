"""Deterministic parser for Rechtspraak XML judgments."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Optional
from xml.etree import ElementTree as ET

from backend_common import compact_text
from parsers._xml import first_text, iter_nodes, local_name


@dataclass
class JudgmentDocument:
    """Normalized case-law document for milestone 1."""

    source_type: str
    source_system: str
    ecli: str
    court: Optional[str]
    decision_date: Optional[date]
    subject: Optional[str]
    raw_xml: str
    text: str
    metadata: dict[str, Any]


def _parse_date(value: Optional[str]) -> Optional[date]:
    """Parse an ISO date when present."""
    if not value:
        return None
    return date.fromisoformat(value)


def parse_judgment_xml(xml_bytes: bytes) -> JudgmentDocument:
    """Parse one Rechtspraak XML payload into a normalized judgment record."""
    root = ET.fromstring(xml_bytes)
    ecli = first_text(root, ("identifier",), startswith="ECLI:")
    if not ecli:
        raise ValueError("Judgment XML does not contain an ECLI identifier.")

    court = first_text(root, ("creator",))
    decision_date = _parse_date(first_text(root, ("date",)))

    subjects = []
    for child in iter_nodes(root, "subject"):
        value = compact_text(" ".join(child.itertext()))
        if value:
            subjects.append(value)
    subject = "; ".join(subjects) if subjects else None

    body_paragraphs = []
    uitspraak_nodes = list(iter_nodes(root, "uitspraak"))
    para_sources = uitspraak_nodes or [root]
    for node in para_sources:
        for para in iter_nodes(node, "para"):
            text = compact_text(" ".join(para.itertext()))
            if text:
                body_paragraphs.append(text)
    text = compact_text("\n\n".join(body_paragraphs))
    if not text:
        text = compact_text(" ".join(root.itertext()))

    return JudgmentDocument(
        source_type="case_law",
        source_system="rechtspraak",
        ecli=ecli,
        court=court,
        decision_date=decision_date,
        subject=subject,
        raw_xml=xml_bytes.decode("utf-8", errors="replace"),
        text=text,
        metadata={
            "body_paragraph_count": len(body_paragraphs),
            "root_tag": local_name(root.tag),
        },
    )
