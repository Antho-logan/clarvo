"""Generate curated Rechtspraak ECLI seeds from the official Open Data API."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sources.rechtspraak_search_client import search_judgment_entries


JSON_OUTPUT_PATH = PROJECT_ROOT / "config" / "seed_eclis.json"
YAML_OUTPUT_PATH = PROJECT_ROOT / "config" / "seeds" / "curated_judgments.yaml"


@dataclass(frozen=True)
class DomainSeedQuery:
    """Search configuration for one Veridicta legal domain."""

    target: int
    subjects: tuple[str, ...]
    keywords: tuple[str, ...] = ()


DOMAIN_QUERIES: dict[str, DomainSeedQuery] = {
    "employment_law": DomainSeedQuery(
        target=250,
        subjects=("http://psi.rechtspraak.nl/rechtsgebied#civielRecht_arbeidsrecht",),
    ),
    "tenancy_law": DomainSeedQuery(
        target=220,
        subjects=(
            "http://psi.rechtspraak.nl/rechtsgebied#civielRecht_verbintenissenrecht",
            "http://psi.rechtspraak.nl/rechtsgebied#civielRecht",
        ),
        keywords=(
            "huur",
            "huurovereenkomst",
            "huurder",
            "verhuurder",
            "woonruimte",
            "bedrijfsruimte",
        ),
    ),
    "administrative_law": DomainSeedQuery(
        target=250,
        subjects=("http://psi.rechtspraak.nl/rechtsgebied#bestuursrecht",),
    ),
    "immigration_law": DomainSeedQuery(
        target=250,
        subjects=("http://psi.rechtspraak.nl/rechtsgebied#bestuursrecht_vreemdelingenrecht",),
    ),
    "sme_business_law": DomainSeedQuery(
        target=250,
        subjects=("http://psi.rechtspraak.nl/rechtsgebied#civielRecht_ondernemingsrecht",),
    ),
}


def discover_domain_eclis(
    domain: str,
    query: DomainSeedQuery,
    *,
    page_size: int,
    max_pages: int,
    global_seen: set[str],
) -> list[str]:
    """Discover one domain's ECLIs while keeping the seed set globally unique."""
    eclis: list[str] = []
    for subject in query.subjects:
        remaining = query.target - len(eclis)
        if remaining <= 0:
            break
        entries = search_judgment_entries(
            subject=subject,
            limit=remaining + len(global_seen),
            keywords=query.keywords or None,
            page_size=page_size,
            max_pages=max_pages,
        )
        for entry in entries:
            if entry.ecli in global_seen:
                continue
            global_seen.add(entry.ecli)
            eclis.append(entry.ecli)
            if len(eclis) >= query.target:
                break

    if len(eclis) < query.target:
        raise RuntimeError(f"Only discovered {len(eclis)} ECLIs for {domain}; target is {query.target}.")
    return eclis


def discover_seed_map(*, page_size: int, max_pages: int) -> dict[str, list[str]]:
    """Discover all configured Veridicta domain seed lists."""
    global_seen: set[str] = set()
    seed_map: dict[str, list[str]] = {}
    for domain, query in DOMAIN_QUERIES.items():
        seed_map[domain] = discover_domain_eclis(
            domain,
            query,
            page_size=page_size,
            max_pages=max_pages,
            global_seen=global_seen,
        )
    return seed_map


def write_seed_files(seed_map: dict[str, list[str]]) -> None:
    """Persist JSON ingestion config and a reviewable YAML mirror."""
    JSON_OUTPUT_PATH.write_text(json.dumps(seed_map, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    YAML_OUTPUT_PATH.write_text(
        "# Curated ECLI seeds grouped by Veridicta domain.\n"
        "# Generated from the official Rechtspraak Open Data search feed.\n"
        + yaml.safe_dump(seed_map, sort_keys=False, allow_unicode=False),
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    """Parse command-line options."""
    parser = argparse.ArgumentParser(description="Discover curated Rechtspraak ECLI seeds.")
    parser.add_argument("--page-size", type=int, default=500, help="Search feed page size.")
    parser.add_argument("--max-pages", type=int, default=20, help="Maximum pages to scan per subject.")
    parser.add_argument("--write", action="store_true", help="Write config/seed_eclis.json and YAML mirror.")
    return parser.parse_args()


def main() -> int:
    """Discover seeds and optionally write them to config."""
    args = parse_args()
    seed_map = discover_seed_map(page_size=args.page_size, max_pages=args.max_pages)
    total = sum(len(items) for items in seed_map.values())
    for domain, items in seed_map.items():
        print(f"{domain}: {len(items)} ECLIs")
    print(f"total: {total} ECLIs")
    if args.write:
        write_seed_files(seed_map)
        print(f"wrote {JSON_OUTPUT_PATH}")
        print(f"wrote {YAML_OUTPUT_PATH}")
    else:
        print("dry_run=true; pass --write to update seed files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
