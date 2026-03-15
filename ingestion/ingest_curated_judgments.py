"""CLI entrypoint for curated milestone-2 judgment ingestion."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ingestion.curated_ingestion import run_curated_judgment_ingestion


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Ingest curated Rechtspraak judgment seeds.")
    parser.add_argument("--domain", help="Optional domain key to ingest.")
    parser.add_argument("--limit", type=int, help="Optional maximum number of seeds to ingest.")
    parser.add_argument("--dry-run", action="store_true", help="List and count selected seeds without ingesting.")
    parser.add_argument("--resume-job-id", type=int, help="Retry failed or incomplete items from a previous job.")
    return parser.parse_args()


def main() -> int:
    """Run curated judgment ingestion and print a concise summary."""
    args = parse_args()
    result = run_curated_judgment_ingestion(
        domain=args.domain,
        limit=args.limit,
        dry_run=args.dry_run,
        resume_job_id=args.resume_job_id,
    )
    print(
        f"job_id={result.job_id} source_system={result.source_system} "
        f"total_items={result.total_items} success_count={result.success_count} "
        f"failure_count={result.failure_count} dry_run={result.dry_run}"
    )
    for warning in result.warnings:
        print(f"warning={warning}")
    return 0 if result.failure_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
