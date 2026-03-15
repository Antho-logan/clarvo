"""
Parse local Wetten.nl XML files and ingest legal structure into PostgreSQL.

The script expects XML files that were previously downloaded locally. The XML
tag naming on Wetten.nl can vary by source, so the parser uses tolerant,
namespace-agnostic extraction rules:
1. It walks through article-like elements.
2. It stores a document row for each article.
3. It stores additional document rows for subsection-like elements such as
   `lid`, `al`, or `paragraph`.

Environment variables:
- DATABASE_URL: PostgreSQL SQLAlchemy URL.
- SOURCE_PATH or WETTEN_XML_SOURCE_PATH: local XML directory.

Examples:
    export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/venice"
    export SOURCE_PATH="/absolute/path/to/local/xml_test_folder"
    python download_and_parse.py
    python download_and_parse.py --source-path ./sample_xml
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable, Optional
from xml.etree import ElementTree as ET

from backend_common import (
    DEFAULT_EFFECTIVE_FROM,
    DEFAULT_EFFECTIVE_TO,
    DEFAULT_SOURCE_PATH,
    Document,
    compact_text,
    get_logger,
    get_session_factory,
)


LOGGER = get_logger("download_and_parse")
ARTICLE_TAGS = {"artikel", "article"}
SUBSECTION_TAGS = {"lid", "al", "paragraph", "subsection", "li"}
SECTION_TAGS = {"hoofdstuk", "afdeling", "paragraaf", "deel", "section"}
TITLE_TAGS = {"kop", "titel", "title", "opschrift", "label", "nr", "nummer"}


def strip_namespace(tag: str) -> str:
    """Convert an XML tag into a lowercase namespace-free tag name."""
    return tag.split("}", 1)[-1].lower()


def iter_text(node: ET.Element) -> Iterable[str]:
    """Yield stripped textual fragments contained in an XML element."""
    for fragment in node.itertext():
        normalized = compact_text(fragment)
        if normalized:
            yield normalized


def first_child_text_by_tag(node: ET.Element, tag_names: set[str]) -> Optional[str]:
    """Return the first descendant text matching one of the provided tag names."""
    for child in node.iter():
        if strip_namespace(child.tag) in tag_names:
            text_value = compact_text(" ".join(iter_text(child)))
            if text_value:
                return text_value
    return None


def infer_article_label(article_node: ET.Element) -> Optional[str]:
    """
    Infer an article label from common XML fields.

    Wetten XML often exposes article numbering in tags like `label`, `nr`,
    or inside a heading block.
    """
    direct_label = first_child_text_by_tag(article_node, {"label", "nr", "nummer"})
    if direct_label:
        return direct_label

    title_text = first_child_text_by_tag(article_node, {"kop", "titel", "title"})
    if title_text:
        return title_text

    return None


def parse_article_rows(
    node: ET.Element,
    bwbr_id: str,
    source_url: str,
    current_section: Optional[str],
) -> list[Document]:
    """Convert a single article node into one or more database rows."""
    article_label = infer_article_label(node)
    article_text = compact_text(" ".join(iter_text(node)))
    if not article_text:
        return []

    rows = [
        Document(
            document_type="article",
            bwbr_id=bwbr_id,
            article=article_label,
            section=current_section,
            effective_from=DEFAULT_EFFECTIVE_FROM,
            effective_to=DEFAULT_EFFECTIVE_TO,
            text=article_text,
            source_url=source_url,
        )
    ]

    subsection_index = 0
    for child in node.iter():
        child_tag = strip_namespace(child.tag)
        if child_tag not in SUBSECTION_TAGS:
            continue

        subsection_text = compact_text(" ".join(iter_text(child)))
        if not subsection_text:
            continue

        subsection_index += 1
        subsection_label = first_child_text_by_tag(child, {"label", "nr", "nummer"}) or f"lid {subsection_index}"
        rows.append(
            Document(
                document_type="subsection",
                bwbr_id=bwbr_id,
                article=article_label,
                section=f"{current_section or ''} | {subsection_label}".strip(" |"),
                effective_from=DEFAULT_EFFECTIVE_FROM,
                effective_to=DEFAULT_EFFECTIVE_TO,
                text=subsection_text,
                source_url=source_url,
            )
        )

    return rows


def walk_xml(node: ET.Element, bwbr_id: str, source_url: str, current_section: Optional[str] = None) -> list[Document]:
    """
    Recursively walk the XML tree and extract documents.

    Section context is tracked while descending through the tree so that
    article rows can carry a human-readable parent section.
    """
    extracted: list[Document] = []
    tag = strip_namespace(node.tag)

    if tag in SECTION_TAGS:
        current_section = first_child_text_by_tag(node, TITLE_TAGS) or current_section

    if tag in ARTICLE_TAGS:
        extracted.extend(parse_article_rows(node, bwbr_id, source_url, current_section))

    for child in list(node):
        extracted.extend(walk_xml(child, bwbr_id, source_url, current_section))

    return extracted


def parse_xml_file(xml_path: Path) -> list[Document]:
    """Parse a single XML file into document rows."""
    tree = ET.parse(xml_path)
    root = tree.getroot()

    bwbr_id = xml_path.stem
    source_url = f"https://wetten.overheid.nl/{bwbr_id}"
    documents = walk_xml(root, bwbr_id=bwbr_id, source_url=source_url)
    LOGGER.info("Parsed %s -> %s rows", xml_path.name, len(documents))
    return documents


def ingest_folder(source_path: Path) -> None:
    """Parse all XML files in a folder and upsert them into PostgreSQL."""
    session_factory = get_session_factory()
    xml_files = sorted(source_path.glob("*.xml"))
    if not xml_files:
        LOGGER.warning("No XML files found in %s", source_path)
        return

    with session_factory() as session:
        for xml_file in xml_files:
            rows = parse_xml_file(xml_file)
            bwbr_id = xml_file.stem

            # Keep ingestion idempotent for local reruns.
            session.query(Document).filter(Document.bwbr_id == bwbr_id).delete()
            session.add_all(rows)
            session.commit()
            LOGGER.info("Stored %s rows for %s", len(rows), bwbr_id)


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Parse local Wetten.nl XML into PostgreSQL.")
    parser.add_argument(
        "--source-path",
        default=DEFAULT_SOURCE_PATH,
        help="Folder containing XML files downloaded from Wetten.nl.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    ingest_folder(Path(args.source_path))
