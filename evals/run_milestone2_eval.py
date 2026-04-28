"""Run a small milestone-2 retrieval evaluation set against stored documents."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from evaluation import evaluate_assistant_cases, evaluate_cases, write_reports


DEFAULT_TESTS_PATH = PROJECT_ROOT / "evals" / "tests_milestone2.json"


def _load_tests(tests_path: Path) -> list[dict]:
    """Load milestone-2 eval definitions from JSON."""
    import json

    with tests_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return list(payload.get("tests", []))


def run_eval(*, tests_path: Path, limit: int, reports_dir: Path) -> int:
    """Execute the milestone-2 eval set and print metrics plus pass/fail summary."""
    tests = _load_tests(tests_path)
    results = evaluate_cases(tests, limit=limit)

    for case in results["cases"]:
        label = "PASS" if case["success"] else "FAIL"
        print(
            f"{label} domain={case['domain']} source_type={case.get('source_type')} "
            f"query={case['query']!r} observed={case['observed'][:limit]}"
        )

    overall = results["summary"]["overall"]
    print(
        "metrics "
        f"precision@{limit}={overall['precision_at_k']:.3f} "
        f"recall@{limit}={overall['recall_at_k']:.3f} "
        f"f1@{limit}={overall['f1_at_k']:.3f} "
        f"mrr={overall['mrr']:.3f} "
        f"ndcg@{limit}={overall['ndcg_at_k']:.3f}"
    )
    json_report, markdown_report = write_reports(results, reports_dir=reports_dir)
    print(f"reports json={json_report} markdown={markdown_report}")
    print(f"summary passed={results['passed']} failed={results['failed']} total={results['total']}")
    assistant_results = evaluate_assistant_cases(tests)
    if assistant_results["total"]:
        print(
            "assistant "
            f"passed={assistant_results['passed']} "
            f"failed={assistant_results['failed']} "
            f"total={assistant_results['total']}"
        )
    return 0 if results["failed"] == 0 else 1


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Run the milestone-2 retrieval eval starter pack.")
    parser.add_argument("--tests-path", default=str(DEFAULT_TESTS_PATH), help="Path to the milestone-2 eval JSON file.")
    parser.add_argument("--limit", type=int, default=5, help="Top-k result count per eval case.")
    parser.add_argument("--reports-dir", default=str(PROJECT_ROOT / "evals" / "reports"), help="Report output directory.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    raise SystemExit(run_eval(tests_path=Path(args.tests_path), limit=args.limit, reports_dir=Path(args.reports_dir)))
