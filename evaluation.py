"""
Evaluation and retrieval quality monitoring.

This module executes a test set against `hybrid_search` and reports recall by
domain, making it suitable for CI or scheduled monitoring.

Environment variables:
- DATABASE_URL
- OPENAI_API_KEY

Example:
    python evaluation.py --tests-path tests.json --top-k 5 --threshold 0.75
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Any

from backend_common import get_logger
from search import hybrid_search


LOGGER = get_logger("evaluation")


def compute_recall(retrieved_items: list[str], expected_items: list[str]) -> float:
    """
    Compute recall for a single test case.

    Recall = (# expected items found in retrieved set) / (# expected items)
    """
    expected_set = {item.lower() for item in expected_items}
    if not expected_set:
        return 1.0

    retrieved_set = {item.lower() for item in retrieved_items}
    matches = len(expected_set.intersection(retrieved_set))
    return matches / len(expected_set)


class Evaluator:
    """Evaluation runner for search quality tests."""

    def __init__(self, tests_path: str = "tests.json") -> None:
        self.tests_path = Path(tests_path)

    def load_tests(self) -> list[dict[str, Any]]:
        """Load test definitions from JSON."""
        with self.tests_path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        return data["tests"]

    def run_tests(self, top_k: int = 5) -> dict[str, Any]:
        """
        Execute the test suite and compute recall grouped by legal domain.

        Each test case can specify:
        - `expected_articles`
        - `expected_case_law`
        """
        domain_scores: dict[str, list[float]] = defaultdict(list)
        case_results: list[dict[str, Any]] = []

        for test_case in self.load_tests():
            query = test_case["query"]
            domain = test_case["domain"]
            expected_articles = test_case.get("expected_articles", [])
            expected_case_law = test_case.get("expected_case_law", [])

            hits = hybrid_search(query, k_bm25=top_k, k_vector=top_k)
            retrieved_articles = [hit.article for hit in hits if hit.article]
            retrieved_case_law = [hit.bwbr_id for hit in hits if hit.bwbr_id]

            article_recall = compute_recall(retrieved_articles, expected_articles)
            case_law_recall = compute_recall(retrieved_case_law, expected_case_law)
            combined_recall = max(article_recall, case_law_recall)

            domain_scores[domain].append(combined_recall)
            case_results.append(
                {
                    "domain": domain,
                    "query": query,
                    "expected_articles": expected_articles,
                    "retrieved_articles": retrieved_articles[:top_k],
                    "recall": combined_recall,
                }
            )

        summary = {
            "cases": case_results,
            "domains": {
                domain: sum(scores) / len(scores)
                for domain, scores in domain_scores.items()
            },
        }
        return summary


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Run retrieval evaluation tests.")
    parser.add_argument("--tests-path", default="tests.json", help="Path to the evaluation test set.")
    parser.add_argument("--top-k", type=int, default=5, help="Top-k results used for recall.")
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.75,
        help="Warning threshold for domain recall.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    evaluator = Evaluator(tests_path=args.tests_path)
    results = evaluator.run_tests(top_k=args.top_k)

    print("Recall by domain:")
    for domain, recall in results["domains"].items():
        print(f"- {domain}: {recall:.2%}")
        if recall < args.threshold:
            print(f"  WARNING: recall below threshold {args.threshold:.0%}")

    print("\nDetailed case results:")
    print(json.dumps(results["cases"], indent=2, ensure_ascii=False))
