"""End-to-end milestone 1 smoke test for official Dutch source ingestion."""

from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from init_db import init_database
from parsers.bwb_parser import parse_law_xml
from parsers.rechtspraak_parser import parse_judgment_xml
from repositories.legal_documents import (
    get_document_by_source_id,
    insert_judgment_document,
    insert_law_document,
)
from sources.bwb_client import fetch_law_xml
from sources.rechtspraak_client import fetch_judgment_xml


LAW_BWBR_ID = "BWBR0001841"
JUDGMENT_ECLI = "ECLI:NL:RBARN:1998:AA1005"


def main() -> int:
    """Run the milestone 1 fetch/parse/store verification flow."""
    warnings: list[str] = []
    try:
        init_database()

        law_fetch = fetch_law_xml(LAW_BWBR_ID)
        law_document = parse_law_xml(LAW_BWBR_ID, law_fetch["toestand_xml"])
        law_insert = insert_law_document(
            law_document,
            source_url=law_fetch["source_urls"]["toestand"],
            fetch_metadata=law_fetch["manifest_metadata"],
        )
        stored_law_rows = get_document_by_source_id(LAW_BWBR_ID)
        if not stored_law_rows:
            raise RuntimeError("No law rows were found after insertion.")

        judgment_fetch = fetch_judgment_xml(JUDGMENT_ECLI)
        judgment_document = parse_judgment_xml(judgment_fetch["xml"])
        judgment_insert = insert_judgment_document(
            judgment_document,
            source_url=judgment_fetch["source_url"],
            fetched_at=judgment_fetch["fetched_at"],
        )
        stored_judgment_rows = get_document_by_source_id(JUDGMENT_ECLI)
        if not stored_judgment_rows:
            raise RuntimeError("No judgment row was found after insertion.")

        if not law_document.title:
            warnings.append("Law title missing from parsed payload.")
        if not judgment_document.subject:
            warnings.append("Judgment subject missing from parsed payload.")

        print("Milestone 1 smoke test: PASS")
        print(f"Law source: {LAW_BWBR_ID}")
        print(f"  selected expression: {law_fetch['expression']}")
        print(f"  filename: {law_fetch['filename']}")
        print(f"  parsed rows: {len(law_document.articles)}")
        print(f"  inserted: {law_insert.inserted}, updated: {law_insert.updated}")
        print(f"  title: {law_document.title or '<missing>'}")
        print(f"Judgment source: {JUDGMENT_ECLI}")
        print(f"  inserted: {judgment_insert.inserted}, updated: {judgment_insert.updated}")
        print(f"  court: {judgment_document.court or '<missing>'}")
        print(f"  decision date: {judgment_document.decision_date or '<missing>'}")
        print(f"  subject: {judgment_document.subject or '<missing>'}")
        print(f"Warnings: {', '.join(warnings) if warnings else 'none'}")
        return 0
    except Exception as exc:  # pragma: no cover - smoke path
        print(f"Milestone 1 smoke test: FAIL - {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
