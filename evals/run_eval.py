"""Run the curated Dutch legal retrieval evaluation set."""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from search import hybrid_search  # noqa: E402

DEFAULT_QA_PATH = PROJECT_ROOT / "evals" / "curated_qa.yaml"
DEFAULT_RESULTS_PATH = PROJECT_ROOT / "evals" / "results" / "latest.json"
DEFAULT_HIT_THRESHOLD = 0.60
DEFAULT_MRR_THRESHOLD = 0.35
DOMAIN_TO_CORPUS_DOMAIN = {
    "employment": "employment_law",
    "tenancy": "tenancy_law",
    "administrative": "administrative_law",
}


@dataclass(frozen=True)
class EvalEntry:
    """One curated retrieval eval entry."""

    id: str
    question: str
    domain: str
    expected_bwbr_ids: set[str]
    expected_articles: set[str]
    min_relevant_hits: int


def _load_entries(path: Path) -> list[EvalEntry]:
    payload = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    raw_entries = payload.get("questions", [])
    if not isinstance(raw_entries, list):
        raise ValueError(f"{path} must contain a top-level questions list.")

    entries: list[EvalEntry] = []
    for raw_entry in raw_entries:
        if not isinstance(raw_entry, dict):
            raise ValueError(f"Invalid eval entry: {raw_entry!r}")
        entries.append(
            EvalEntry(
                id=str(raw_entry["id"]),
                question=str(raw_entry["question"]),
                domain=str(raw_entry["domain"]),
                expected_bwbr_ids={
                    str(item).upper() for item in raw_entry.get("expected_bwbr_ids", [])
                },
                expected_articles={
                    _normalize_article(str(item))
                    for item in raw_entry.get("expected_articles", [])
                },
                min_relevant_hits=int(raw_entry.get("min_relevant_hits", 1)),
            )
        )
    return entries


def _normalize_article(value: str | None) -> str:
    if not value:
        return ""
    normalized = value.strip().lower()
    if normalized.startswith("artikel "):
        normalized = normalized[len("artikel ") :]
    return normalized.replace(" ", "")


def _article_matches(observed: str | None, expected_articles: set[str]) -> bool:
    if not expected_articles:
        return True
    normalized_observed = _normalize_article(observed)
    if not normalized_observed:
        return False
    for expected in expected_articles:
        if normalized_observed == expected:
            return True
        if ":" in expected and normalized_observed == expected.split(":", 1)[1]:
            return True
    return False


def _is_relevant(hit: Any, entry: EvalEntry) -> bool:
    bwbr_id = str(getattr(hit, "bwbr_id", "") or "").upper()
    article = getattr(hit, "article", None)
    return bwbr_id in entry.expected_bwbr_ids and _article_matches(
        article, entry.expected_articles
    )


def _reciprocal_rank(relevance: list[int]) -> float:
    return next(
        (1.0 / (index + 1) for index, value in enumerate(relevance) if value), 0.0
    )


def _evaluate_entry(entry: EvalEntry, *, k: int) -> dict[str, Any]:
    corpus_domain = DOMAIN_TO_CORPUS_DOMAIN.get(entry.domain, entry.domain)
    hits = hybrid_search(entry.question, k_bm25=k, k_vector=k, domain=corpus_domain)
    relevance = [1 if _is_relevant(hit, entry) else 0 for hit in hits[:k]]
    relevant_hits = sum(relevance)
    expected_count = max(len(entry.expected_articles), entry.min_relevant_hits)
    recall = (
        min(relevant_hits, expected_count) / expected_count if expected_count else 1.0
    )
    hit_at_10 = 1.0 if relevant_hits >= entry.min_relevant_hits else 0.0
    mrr = _reciprocal_rank(relevance)

    return {
        "id": entry.id,
        "question": entry.question,
        "domain": entry.domain,
        "corpus_domain": corpus_domain,
        "expected_bwbr_ids": sorted(entry.expected_bwbr_ids),
        "expected_articles": sorted(entry.expected_articles),
        "hit_at_10": hit_at_10,
        "mrr_at_10": mrr,
        "recall_at_10": recall,
        "relevant_hits": relevant_hits,
        "observed": [
            {
                "rank": index + 1,
                "bwbr_id": hit.bwbr_id,
                "article": hit.article,
                "source_id": hit.source_id,
                "title": hit.title,
                "score": hit.score,
            }
            for index, hit in enumerate(hits[:k])
        ],
    }


def _average(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _aggregate(cases: list[dict[str, Any]]) -> dict[str, Any]:
    by_domain: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for case in cases:
        by_domain[str(case["domain"])].append(case)

    def metrics(items: list[dict[str, Any]]) -> dict[str, float]:
        return {
            "hit_at_10": _average([float(item["hit_at_10"]) for item in items]),
            "mrr_at_10": _average([float(item["mrr_at_10"]) for item in items]),
            "recall_at_10": _average([float(item["recall_at_10"]) for item in items]),
        }

    return {
        "overall": metrics(cases),
        "domains": {
            domain: metrics(items) for domain, items in sorted(by_domain.items())
        },
    }


def run_eval(
    *,
    qa_path: Path,
    results_path: Path,
    hit_threshold: float,
    mrr_threshold: float,
) -> int:
    entries = _load_entries(qa_path)
    cases = [_evaluate_entry(entry, k=10) for entry in entries]
    summary = _aggregate(cases)
    results = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "qa_path": str(qa_path),
        "thresholds": {
            "hit_at_10": hit_threshold,
            "mrr_at_10": mrr_threshold,
        },
        "summary": summary,
        "cases": cases,
    }

    results_path.parent.mkdir(parents=True, exist_ok=True)
    results_path.write_text(
        json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    for domain, metrics in summary["domains"].items():
        print(
            f"{domain}: hit@10={metrics['hit_at_10']:.3f} "
            f"mrr@10={metrics['mrr_at_10']:.3f} "
            f"recall@10={metrics['recall_at_10']:.3f}"
        )
    overall = summary["overall"]
    print(
        f"overall: hit@10={overall['hit_at_10']:.3f} "
        f"mrr@10={overall['mrr_at_10']:.3f} "
        f"recall@10={overall['recall_at_10']:.3f}"
    )
    print(f"results={results_path}")

    if overall["hit_at_10"] < hit_threshold or overall["mrr_at_10"] < mrr_threshold:
        return 1
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run curated Dutch legal retrieval evals."
    )
    parser.add_argument("--qa-path", default=str(DEFAULT_QA_PATH))
    parser.add_argument("--results-path", default=str(DEFAULT_RESULTS_PATH))
    parser.add_argument("--hit-threshold", type=float, default=DEFAULT_HIT_THRESHOLD)
    parser.add_argument("--mrr-threshold", type=float, default=DEFAULT_MRR_THRESHOLD)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    raise SystemExit(
        run_eval(
            qa_path=Path(args.qa_path),
            results_path=Path(args.results_path),
            hit_threshold=args.hit_threshold,
            mrr_threshold=args.mrr_threshold,
        )
    )
