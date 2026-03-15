"""Minimal searchability proof for milestone 1 stored documents."""

from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import text

from backend_common import get_session_factory


def main() -> int:
    """Verify that inserted law and judgment rows are retrievable."""
    session_factory = get_session_factory()
    with session_factory() as session:
        law_count = session.execute(
            text(
                """
                SELECT COUNT(*)
                FROM documents
                WHERE source_id = :source_id
                  AND to_tsvector(
                        'dutch',
                        coalesce(title, '') || ' ' ||
                        coalesce(article, '') || ' ' ||
                        coalesce(section, '') || ' ' ||
                        coalesce(text, '')
                      ) @@ websearch_to_tsquery('dutch', :query)
                """
            ),
            {"source_id": "BWBR0001841", "query": "onderzoek"},
        ).scalar_one()

        judgment_count = session.execute(
            text(
                """
                SELECT COUNT(*)
                FROM documents
                WHERE source_id = :source_id
                   OR ecli = :source_id
                   OR text ILIKE :snippet
                """
            ),
            {"source_id": "ECLI:NL:RBARN:1998:AA1005", "snippet": "%bestuursrecht%"},
        ).scalar_one()

    if not law_count or not judgment_count:
        print("Search sanity check: FAIL")
        print(f"  law matches: {law_count}")
        print(f"  judgment matches: {judgment_count}")
        return 1

    print("Search sanity check: PASS")
    print(f"  law matches: {law_count}")
    print(f"  judgment matches: {judgment_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
