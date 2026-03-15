"""Run a small milestone-2 retrieval evaluation set against stored documents."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from search import bm25_search


DEFAULT_TESTS_PATH = PROJECT_ROOT / "evals" / "tests_milestone2.json"


def _load_tests(tests_path: Path) -> list[dict]:
    """Load milestone-2 eval definitions from JSON."""
    with tests_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return list(payload.get("tests", []))


def _matches_expectations(hits, expected_source_ids: list[str], expected_keywords: list[str]) -> tuple[bool, list[str]]:
    """Return whether any hit satisfies the configured expectations."""
    observed = []
    expected_ids_normalized = {item.lower() for item in expected_source_ids}
    expected_keywords_normalized = [item.lower() for item in expected_keywords]

    for hit in hits:
        observed.append(hit.source_id or hit.title or hit.id)
        haystacks = [
            (hit.source_id or "").lower(),
            (hit.title or "").lower(),
            hit.text.lower(),
        ]
        if expected_ids_normalized and any((hit.source_id or "").lower() == item for item in expected_ids_normalized):
            return True, observed
        if expected_keywords_normalized and any(keyword in haystack for keyword in expected_keywords_normalized for haystack in haystacks):
            return True, observed
    return False, observed


def run_eval(*, tests_path: Path, limit: int) -> int:
    """Execute the milestone-2 eval set and print a pass/fail summary."""
    tests = _load_tests(tests_path)
    passed = 0
    failed = 0

    for test_case in tests:
        hits = bm25_search(
            test_case["query"],
            limit=limit,
            source_type=test_case.get("source_type"),
            domain=test_case.get("domain"),
        )
        success, observed = _matches_expectations(
            hits,
            expected_source_ids=list(test_case.get("expected_source_ids", [])),
            expected_keywords=list(test_case.get("expected_keywords", [])),
        )
        label = "PASS" if success else "FAIL"
        print(
            f"{label} domain={test_case['domain']} source_type={test_case.get('source_type')} "
            f"query={test_case['query']!r} observed={observed[:limit]}"
        )
        if success:
            passed += 1
        else:
            failed += 1

    print(f"summary passed={passed} failed={failed} total={len(tests)}")
    return 0 if failed == 0 else 1


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Run the milestone-2 retrieval eval starter pack.")
    parser.add_argument("--tests-path", default=str(DEFAULT_TESTS_PATH), help="Path to the milestone-2 eval JSON file.")
    parser.add_argument("--limit", type=int, default=5, help="Top-k result count per eval case.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    raise SystemExit(run_eval(tests_path=Path(args.tests_path), limit=args.limit))
