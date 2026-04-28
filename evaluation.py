"""Retrieval evaluation metrics and reporting helpers."""

from __future__ import annotations

import argparse
import json
import math
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable

from backend_common import get_logger


LOGGER = get_logger("evaluation")


@dataclass(frozen=True)
class RankingMetrics:
    """Ranking quality metrics for one query."""

    precision_at_k: float
    recall_at_k: float
    f1_at_k: float
    mrr: float
    ndcg_at_k: float
    relevant_retrieved: int
    expected_count: int

    def as_dict(self) -> dict[str, float | int]:
        return {
            "precision_at_k": self.precision_at_k,
            "recall_at_k": self.recall_at_k,
            "f1_at_k": self.f1_at_k,
            "mrr": self.mrr,
            "ndcg_at_k": self.ndcg_at_k,
            "relevant_retrieved": self.relevant_retrieved,
            "expected_count": self.expected_count,
        }


def _dcg(relevance: list[int], k: int) -> float:
    return sum((2**rel - 1) / math.log2(rank + 2) for rank, rel in enumerate(relevance[:k]))


def compute_ranking_metrics(relevance: list[int], expected_count: int, *, k: int) -> RankingMetrics:
    """Compute P@k, R@k, F1@k, MRR, and nDCG@k from binary relevance."""
    if k <= 0:
        raise ValueError("k must be positive.")

    relevance_at_k = relevance[:k]
    relevant_retrieved = sum(relevance_at_k)
    expected_count = max(expected_count, relevant_retrieved)
    precision = relevant_retrieved / k
    recall = relevant_retrieved / expected_count if expected_count else 1.0
    f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
    reciprocal_rank = next((1 / (index + 1) for index, rel in enumerate(relevance) if rel), 0.0)
    ideal = [1] * min(expected_count, k)
    ideal_dcg = _dcg(ideal, k)
    ndcg = _dcg(relevance_at_k, k) / ideal_dcg if ideal_dcg else 1.0
    return RankingMetrics(
        precision_at_k=precision,
        recall_at_k=recall,
        f1_at_k=f1,
        mrr=reciprocal_rank,
        ndcg_at_k=ndcg,
        relevant_retrieved=relevant_retrieved,
        expected_count=expected_count,
    )


def _average(values: Iterable[float]) -> float:
    values = list(values)
    return sum(values) / len(values) if values else 0.0


def summarize_cases(cases: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute overall and per-domain averages from evaluated cases."""
    metric_keys = ("precision_at_k", "recall_at_k", "f1_at_k", "mrr", "ndcg_at_k")
    by_domain: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for case in cases:
        by_domain[case["domain"]].append(case["metrics"])

    return {
        "overall": {
            key: _average(case["metrics"][key] for case in cases)
            for key in metric_keys
        },
        "domains": {
            domain: {
                key: _average(metrics[key] for metrics in domain_metrics)
                for key in metric_keys
            }
            for domain, domain_metrics in sorted(by_domain.items())
        },
    }


def _hit_label(hit: Any) -> str:
    return hit.source_id or hit.ecli or hit.bwbr_id or hit.title or hit.id


def _is_relevant(hit: Any, *, expected_source_ids: set[str], expected_keywords: list[str]) -> bool:
    haystacks = [
        (hit.source_id or "").lower(),
        (hit.ecli or "").lower(),
        (hit.bwbr_id or "").lower(),
        (hit.title or "").lower(),
        (hit.text or "").lower(),
    ]
    if expected_source_ids and any(value in expected_source_ids for value in haystacks[:3]):
        return True
    if expected_keywords and any(keyword in haystack for keyword in expected_keywords for haystack in haystacks):
        return True
    return False


def evaluate_cases(
    tests: list[dict[str, Any]],
    *,
    limit: int,
    search_fn: Callable[..., list[Any]] | None = None,
) -> dict[str, Any]:
    """Run an evaluation test set against a search function."""
    if search_fn is None:
        from search import bm25_search

        search_fn = bm25_search

    cases: list[dict[str, Any]] = []
    passed = 0

    for test_case in tests:
        hits = search_fn(
            test_case["query"],
            limit=limit,
            source_type=test_case.get("source_type"),
            domain=test_case.get("domain"),
        )
        expected_source_ids = {item.lower() for item in test_case.get("expected_source_ids", [])}
        expected_keywords = [item.lower() for item in test_case.get("expected_keywords", [])]
        relevance = [
            1 if _is_relevant(hit, expected_source_ids=expected_source_ids, expected_keywords=expected_keywords) else 0
            for hit in hits
        ]
        expected_count = len(expected_source_ids) or (1 if expected_keywords else 0)
        metrics = compute_ranking_metrics(relevance, expected_count, k=limit)
        success = metrics.relevant_retrieved > 0
        if success:
            passed += 1

        cases.append(
            {
                "domain": test_case.get("domain", "unknown"),
                "source_type": test_case.get("source_type"),
                "query": test_case["query"],
                "success": success,
                "observed": [_hit_label(hit) for hit in hits[:limit]],
                "expected_source_ids": list(test_case.get("expected_source_ids", [])),
                "expected_keywords": list(test_case.get("expected_keywords", [])),
                "metrics": metrics.as_dict(),
            }
        )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "limit": limit,
        "passed": passed,
        "failed": len(tests) - passed,
        "total": len(tests),
        "summary": summarize_cases(cases),
        "cases": cases,
    }


def evaluate_assistant_cases(
    tests: list[dict[str, Any]],
    *,
    assistant_fn: Callable[..., dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Check assistant grounding status and citation presence for starter cases."""
    if assistant_fn is None:
        from agentic_orchestrator import chat

        assistant_fn = chat

    cases: list[dict[str, Any]] = []
    passed = 0
    assistant_tests = [test for test in tests if test.get("assistant")]

    for test_case in assistant_tests:
        result = assistant_fn(test_case["query"], domain=test_case.get("domain"))
        citations = result.get("citations") or []
        expected_refusal = bool(test_case.get("expect_refusal"))
        success = (
            result.get("status") == "insufficient_sources"
            if expected_refusal
            else result.get("status") == "grounded" and len(citations) > 0
        )
        if success:
            passed += 1
        cases.append(
            {
                "domain": test_case.get("domain", "unknown"),
                "query": test_case["query"],
                "success": success,
                "status": result.get("status"),
                "citation_count": len(citations),
                "expect_refusal": expected_refusal,
            }
        )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "passed": passed,
        "failed": len(cases) - passed,
        "total": len(cases),
        "cases": cases,
    }


def write_reports(results: dict[str, Any], *, reports_dir: Path) -> tuple[Path, Path]:
    """Write JSON and Markdown evaluation reports."""
    reports_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path = reports_dir / f"{stamp}.json"
    md_path = reports_dir / f"{stamp}.md"

    json_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")

    overall = results["summary"]["overall"]
    lines = [
        "# Retrieval Evaluation Report",
        "",
        f"Generated: `{results['generated_at']}`",
        f"Top-k: `{results['limit']}`",
        f"Cases: `{results['passed']}` passed / `{results['failed']}` failed / `{results['total']}` total",
        "",
        "## Overall Metrics",
        "",
        "| Metric | Value |",
        "|---|---:|",
        f"| Precision@k | {overall['precision_at_k']:.3f} |",
        f"| Recall@k | {overall['recall_at_k']:.3f} |",
        f"| F1@k | {overall['f1_at_k']:.3f} |",
        f"| MRR | {overall['mrr']:.3f} |",
        f"| nDCG@k | {overall['ndcg_at_k']:.3f} |",
        "",
        "## Domain Breakdown",
        "",
        "| Domain | Precision@k | Recall@k | F1@k | MRR | nDCG@k |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for domain, metrics in results["summary"]["domains"].items():
        lines.append(
            f"| {domain} | {metrics['precision_at_k']:.3f} | {metrics['recall_at_k']:.3f} | "
            f"{metrics['f1_at_k']:.3f} | {metrics['mrr']:.3f} | {metrics['ndcg_at_k']:.3f} |"
        )
    lines.extend(["", "## Cases", ""])
    for case in results["cases"]:
        label = "PASS" if case["success"] else "FAIL"
        lines.append(f"- **{label}** `{case['domain']}` `{case.get('source_type')}`: {case['query']}")
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    return json_path, md_path


def _load_tests(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return list(payload.get("tests", []))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run retrieval evaluation tests.")
    parser.add_argument("--tests-path", default="evals/tests_milestone2.json", help="Path to the evaluation test set.")
    parser.add_argument("--top-k", type=int, default=10, help="Top-k results used for metrics.")
    parser.add_argument("--reports-dir", default="evals/reports", help="Directory for JSON and Markdown reports.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    results = evaluate_cases(_load_tests(Path(args.tests_path)), limit=args.top_k)
    json_report, markdown_report = write_reports(results, reports_dir=Path(args.reports_dir))

    print(json.dumps(results["summary"], indent=2, ensure_ascii=False))
    print(f"reports json={json_report} markdown={markdown_report}")
