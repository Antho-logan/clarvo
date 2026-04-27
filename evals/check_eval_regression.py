"""Fail CI when retrieval metrics regress beyond an allowed threshold."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def _load_latest_report(reports_dir: Path) -> dict:
    reports = sorted(reports_dir.glob("*.json"))
    if not reports:
        raise FileNotFoundError(f"No JSON reports found in {reports_dir}")
    return json.loads(reports[-1].read_text(encoding="utf-8"))


def _metric(report: dict, metric: str) -> float:
    metrics = report.get("metrics", {})
    value = metrics.get(metric)
    if not isinstance(value, (int, float)):
        raise KeyError(f"Metric {metric!r} was not found in report metrics.")
    return float(value)


def main() -> int:
    parser = argparse.ArgumentParser(description="Check retrieval eval regression.")
    parser.add_argument("--baseline", required=True)
    parser.add_argument("--latest-dir", required=True)
    parser.add_argument("--metric", default="ndcg@10")
    parser.add_argument("--max-regression", type=float, default=0.05)
    args = parser.parse_args()

    baseline = json.loads(Path(args.baseline).read_text(encoding="utf-8"))
    latest = _load_latest_report(Path(args.latest_dir))
    baseline_value = _metric(baseline, args.metric)
    latest_value = _metric(latest, args.metric)
    allowed = baseline_value - args.max_regression
    print(
        f"{args.metric}: baseline={baseline_value:.3f} latest={latest_value:.3f} allowed_min={allowed:.3f}"
    )
    return 0 if latest_value >= allowed else 1


if __name__ == "__main__":
    raise SystemExit(main())
