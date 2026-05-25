"""Print grouped embedding lifecycle coverage for operators."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from repositories.embeddings import (  # noqa: E402
    get_embedding_coverage,
    mark_embedding_lifecycle_states,
    summarize_embedding_coverage,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Report Clarvo embedding coverage.")
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Scan documents first and update missing/stale/skipped lifecycle states.",
    )
    parser.add_argument(
        "--refresh-limit",
        type=int,
        default=None,
        help="Optional maximum number of documents to scan when --refresh is set.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.refresh:
        result = mark_embedding_lifecycle_states(limit=args.refresh_limit)
        print(f"Lifecycle refresh: {result}")

    rows = get_embedding_coverage()
    totals = summarize_embedding_coverage(rows)
    print("Embedding coverage totals")
    for status, count in sorted(totals.items()):
        print(f"  {status}: {count}")

    if not rows:
        print("\nNo documents found.")
        return

    print("\nBy source/domain/model")
    header = (
        "source_type",
        "source_system",
        "domain",
        "status",
        "model",
        "version",
        "dims",
        "count",
    )
    print(" | ".join(header))
    print("-" * 110)
    for row in rows:
        print(
            " | ".join(
                [
                    row.source_type or "-",
                    row.source_system or "-",
                    row.domain or "-",
                    row.embedding_status,
                    row.embedding_model or "-",
                    row.embedding_version or "-",
                    str(row.embedding_dimensions or "-"),
                    str(row.count),
                ]
            )
        )


if __name__ == "__main__":
    main()
