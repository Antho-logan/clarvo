"""Curated milestone-2 ingestion services built on the milestone-1 pipeline."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from backend_common import get_logger, get_parser_version, get_repo_root, utcnow
from parsers.bwb_parser import parse_law_xml
from parsers.rechtspraak_parser import parse_judgment_xml
from repositories.ingestion_jobs import (
    create_job,
    finalize_job,
    list_retryable_items,
    mark_job_running,
    upsert_job_item,
    upsert_source_registry,
)
from repositories.legal_documents import (
    InsertSummary,
    count_documents_by_source_id,
    insert_judgment_document,
    insert_law_document,
)
from sources.bwb_client import fetch_law_xml
from sources.rechtspraak_client import fetch_judgment_xml


LOGGER = get_logger("ingestion.curated")
SEED_CONFIG_DIR = get_repo_root() / "config"
PRIORITY_DOMAINS = ("employment_law", "tenancy_law", "administrative_law")


@dataclass(frozen=True)
class CuratedSeed:
    """One source identifier assigned to one domain."""

    domain: str | None
    identifier: str
    priority: int = 100


@dataclass
class CuratedIngestionResult:
    """Summary returned by curated ingestion runs."""

    job_id: int | None
    source_type: str
    source_system: str
    domain: str | None
    total_items: int
    success_count: int
    failure_count: int
    dry_run: bool
    warnings: list[str]

    def as_dict(self) -> dict:
        """Serialize the summary to a JSON-friendly dictionary."""
        return {
            "job_id": self.job_id,
            "source_type": self.source_type,
            "source_system": self.source_system,
            "domain": self.domain,
            "total_items": self.total_items,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "dry_run": self.dry_run,
            "warnings": self.warnings,
        }


def _normalize_seed_entry(entry: object, *, default_priority: int) -> tuple[str, int]:
    """Normalize a string or structured YAML seed entry."""
    if isinstance(entry, str):
        return entry, default_priority
    if isinstance(entry, dict):
        identifier = str(entry.get("identifier") or entry.get("id") or "").strip()
        if not identifier:
            raise ValueError(f"Structured seed entry is missing an identifier: {entry!r}")
        priority = int(entry.get("priority", default_priority))
        return identifier, priority
    raise ValueError(f"Unsupported seed entry: {entry!r}")


def _load_seed_map(filename: str, *, yaml_filename: str | None = None) -> dict[str, list[CuratedSeed]]:
    """Load curated seeds from structured YAML, falling back to legacy JSON."""
    yaml_path = SEED_CONFIG_DIR / "seeds" / yaml_filename if yaml_filename else None
    if yaml_path and yaml_path.exists():
        data = yaml.safe_load(yaml_path.read_text(encoding="utf-8")) or {}
        if not isinstance(data, dict):
            raise ValueError(f"Seed config {yaml_path} must contain an object at the top level.")
        return _normalize_seed_map(data, source_path=yaml_path)

    path = SEED_CONFIG_DIR / filename
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"Seed config {path} must contain an object at the top level.")
    return _normalize_seed_map(data, source_path=path)


def _normalize_seed_map(data: dict[Any, Any], *, source_path: Path) -> dict[str, list[CuratedSeed]]:
    """Normalize a domain-keyed seed payload into sorted curated seeds."""
    normalized: dict[str, list[CuratedSeed]] = {}
    for domain_key, raw_entries in data.items():
        domain = str(domain_key)
        if not isinstance(raw_entries, list):
            raise ValueError(f"Seed config {source_path} domain {domain!r} must contain a list.")
        seeds: list[CuratedSeed] = []
        for index, entry in enumerate(raw_entries):
            identifier, priority = _normalize_seed_entry(entry, default_priority=index + 1)
            seeds.append(CuratedSeed(domain=domain, identifier=identifier, priority=priority))
        normalized[domain] = sorted(seeds, key=lambda item: (item.priority, item.identifier))
    return normalized


def _select_seeds(seed_map: dict[str, list[CuratedSeed]], *, domain: str | None, limit: int | None) -> list[CuratedSeed]:
    """Flatten domain-grouped seeds into a deterministic work list."""
    if domain is not None and domain not in seed_map:
        raise ValueError(f"Unknown domain {domain!r}. Known domains: {', '.join(sorted(seed_map))}")

    selected_domains = [domain] if domain is not None else [item for item in PRIORITY_DOMAINS if item in seed_map]
    seeds: list[CuratedSeed] = []
    for selected_domain in selected_domains:
        seeds.extend(seed_map[selected_domain])

    if limit is not None:
        return seeds[:limit]
    return seeds


def _load_resume_seeds(job_id: int, *, source_type: str, source_system: str, domain: str | None, limit: int | None) -> list[CuratedSeed]:
    """Load retryable items from a previous ingestion job."""
    seeds: list[CuratedSeed] = []
    for item in list_retryable_items(job_id):
        if item.source_type != source_type or item.source_system != source_system:
            continue
        if domain is not None and item.domain != domain:
            continue
        seeds.append(CuratedSeed(domain=item.domain or domain, identifier=item.source_identifier))
    if limit is not None:
        return seeds[:limit]
    return seeds


def _create_job_items(job_id: int, *, seeds: list[CuratedSeed], source_type: str, source_system: str) -> None:
    """Seed the ingestion audit log with pending rows before processing."""
    for seed in seeds:
        upsert_job_item(
            job_id=job_id,
            source_type=source_type,
            source_system=source_system,
            source_identifier=seed.identifier,
            domain=seed.domain or None,
            status="pending",
        )


def _record_success(
    *,
    job_id: int,
    source_type: str,
    source_system: str,
    seed: CuratedSeed,
    fetched_at,
    insert_summary: InsertSummary,
) -> None:
    """Persist a successful job item result."""
    upsert_job_item(
        job_id=job_id,
        source_type=source_type,
        source_system=source_system,
        source_identifier=seed.identifier,
        domain=seed.domain or None,
        status="success",
        fetched_at=fetched_at,
        inserted_count=insert_summary.inserted,
    )


def _record_failure(
    *,
    job_id: int,
    source_type: str,
    source_system: str,
    seed: CuratedSeed,
    error_message: str,
) -> None:
    """Persist a failed job item result."""
    upsert_job_item(
        job_id=job_id,
        source_type=source_type,
        source_system=source_system,
        source_identifier=seed.identifier,
        domain=seed.domain or None,
        status="failed",
        error_message=error_message[:2000],
    )


def run_curated_law_ingestion(
    *,
    domain: str | None = None,
    limit: int | None = None,
    dry_run: bool = False,
    resume_job_id: int | None = None,
    queued_job_id: int | None = None,
) -> CuratedIngestionResult:
    """Run curated legislation ingestion for one or all domains."""
    source_type = "legislation"
    source_system = "bwb"
    warnings: list[str] = []
    seed_map = _load_seed_map("seed_bwbr_ids.json", yaml_filename="curated_laws.yaml")
    seeds = (
        _load_resume_seeds(
            resume_job_id,
            source_type=source_type,
            source_system=source_system,
            domain=domain,
            limit=limit,
        )
        if resume_job_id is not None
        else _select_seeds(seed_map, domain=domain, limit=limit)
    )
    if not seeds:
        warning = "No curated law seeds matched the requested selection."
        LOGGER.warning(warning)
        if queued_job_id is not None:
            mark_job_running(queued_job_id, total_items=0, notes=warning)
            finalize_job(
                queued_job_id,
                status="completed",
                success_count=0,
                failure_count=0,
                notes=warning,
            )
        return CuratedIngestionResult(
            job_id=queued_job_id,
            source_type=source_type,
            source_system=source_system,
            domain=domain,
            total_items=0,
            success_count=0,
            failure_count=0,
            dry_run=dry_run,
            warnings=[warning],
        )

    if dry_run:
        LOGGER.info("Dry run selected %s curated law seeds.", len(seeds))
        if queued_job_id is not None:
            mark_job_running(
                queued_job_id,
                total_items=len(seeds),
                notes=f"dry run selected {len(seeds)} curated law seeds",
            )
            finalize_job(
                queued_job_id,
                status="completed",
                success_count=0,
                failure_count=0,
                notes=f"dry run selected {len(seeds)} curated law seeds",
            )
        return CuratedIngestionResult(
            job_id=queued_job_id,
            source_type=source_type,
            source_system=source_system,
            domain=domain,
            total_items=len(seeds),
            success_count=0,
            failure_count=0,
            dry_run=True,
            warnings=[],
        )

    notes = "curated law ingestion"
    if resume_job_id is not None:
        notes = f"{notes}; resume_of_job={resume_job_id}"
    job = (
        mark_job_running(queued_job_id, total_items=len(seeds), notes=notes)
        if queued_job_id is not None
        else create_job(
            job_type="curated_laws",
            source_system=source_system,
            domain=domain,
            total_items=len(seeds),
            notes=notes,
        )
    )
    _create_job_items(job.id, seeds=seeds, source_type=source_type, source_system=source_system)

    success_count = 0
    failure_count = 0
    parser_version = get_parser_version()

    for seed in seeds:
        LOGGER.info("Ingesting law %s domain=%s job_id=%s", seed.identifier, seed.domain, job.id)
        upsert_job_item(
            job_id=job.id,
            source_type=source_type,
            source_system=source_system,
            source_identifier=seed.identifier,
            domain=seed.domain or None,
            status="running",
        )
        try:
            payload = fetch_law_xml(seed.identifier)
            source_url = payload["source_urls"]["toestand"]
            upsert_source_registry(
                source_system=source_system,
                source_type=source_type,
                identifier=seed.identifier,
                domain=seed.domain or None,
                source_url=source_url,
                editorial_priority=seed.priority,
                notes="phase3 curated priority seed",
            )
            parsed = parse_law_xml(seed.identifier, payload["toestand_xml"])
            fetched_at = utcnow()
            existing_count = count_documents_by_source_id(seed.identifier, domain=seed.domain or None)
            insert_summary = insert_law_document(
                parsed,
                domain=seed.domain or None,
                source_url=source_url,
                fetched_at=fetched_at,
                parser_version=parser_version,
                fetch_metadata=payload.get("manifest_metadata"),
            )
            if existing_count > 0 and insert_summary.inserted == 0:
                warning = f"Law {seed.identifier} domain={seed.domain} already existed; rows were refreshed in place."
                warnings.append(warning)
                LOGGER.info(warning)
            _record_success(
                job_id=job.id,
                source_type=source_type,
                source_system=source_system,
                seed=seed,
                fetched_at=fetched_at,
                insert_summary=insert_summary,
            )
            success_count += 1
        except Exception as exc:
            error_message = str(exc)
            LOGGER.exception("Curated law ingestion failed for %s domain=%s", seed.identifier, seed.domain)
            _record_failure(
                job_id=job.id,
                source_type=source_type,
                source_system=source_system,
                seed=seed,
                error_message=error_message,
            )
            failure_count += 1

    status = "completed" if failure_count == 0 else "completed_with_errors"
    finalize_job(
        job.id,
        status=status,
        success_count=success_count,
        failure_count=failure_count,
    )
    return CuratedIngestionResult(
        job_id=job.id,
        source_type=source_type,
        source_system=source_system,
        domain=domain,
        total_items=len(seeds),
        success_count=success_count,
        failure_count=failure_count,
        dry_run=False,
        warnings=warnings,
    )


def run_curated_judgment_ingestion(
    *,
    domain: str | None = None,
    limit: int | None = None,
    dry_run: bool = False,
    resume_job_id: int | None = None,
    queued_job_id: int | None = None,
) -> CuratedIngestionResult:
    """Run curated case-law ingestion for one or all domains."""
    source_type = "case_law"
    source_system = "rechtspraak"
    warnings: list[str] = []
    seed_map = _load_seed_map("seed_eclis.json", yaml_filename="curated_judgments.yaml")
    seeds = (
        _load_resume_seeds(
            resume_job_id,
            source_type=source_type,
            source_system=source_system,
            domain=domain,
            limit=limit,
        )
        if resume_job_id is not None
        else _select_seeds(seed_map, domain=domain, limit=limit)
    )
    if not seeds:
        warning = "No curated judgment seeds matched the requested selection."
        LOGGER.warning(warning)
        if queued_job_id is not None:
            mark_job_running(queued_job_id, total_items=0, notes=warning)
            finalize_job(
                queued_job_id,
                status="completed",
                success_count=0,
                failure_count=0,
                notes=warning,
            )
        return CuratedIngestionResult(
            job_id=queued_job_id,
            source_type=source_type,
            source_system=source_system,
            domain=domain,
            total_items=0,
            success_count=0,
            failure_count=0,
            dry_run=dry_run,
            warnings=[warning],
        )

    if dry_run:
        LOGGER.info("Dry run selected %s curated judgment seeds.", len(seeds))
        if queued_job_id is not None:
            mark_job_running(
                queued_job_id,
                total_items=len(seeds),
                notes=f"dry run selected {len(seeds)} curated judgment seeds",
            )
            finalize_job(
                queued_job_id,
                status="completed",
                success_count=0,
                failure_count=0,
                notes=f"dry run selected {len(seeds)} curated judgment seeds",
            )
        return CuratedIngestionResult(
            job_id=queued_job_id,
            source_type=source_type,
            source_system=source_system,
            domain=domain,
            total_items=len(seeds),
            success_count=0,
            failure_count=0,
            dry_run=True,
            warnings=[],
        )

    notes = "curated judgment ingestion"
    if resume_job_id is not None:
        notes = f"{notes}; resume_of_job={resume_job_id}"
    job = (
        mark_job_running(queued_job_id, total_items=len(seeds), notes=notes)
        if queued_job_id is not None
        else create_job(
            job_type="curated_judgments",
            source_system=source_system,
            domain=domain,
            total_items=len(seeds),
            notes=notes,
        )
    )
    _create_job_items(job.id, seeds=seeds, source_type=source_type, source_system=source_system)

    success_count = 0
    failure_count = 0
    parser_version = get_parser_version()

    for seed in seeds:
        LOGGER.info("Ingesting judgment %s domain=%s job_id=%s", seed.identifier, seed.domain, job.id)
        upsert_job_item(
            job_id=job.id,
            source_type=source_type,
            source_system=source_system,
            source_identifier=seed.identifier,
            domain=seed.domain or None,
            status="running",
        )
        try:
            payload = fetch_judgment_xml(seed.identifier)
            upsert_source_registry(
                source_system=source_system,
                source_type=source_type,
                identifier=seed.identifier,
                domain=seed.domain or None,
                source_url=payload["source_url"],
                editorial_priority=seed.priority,
                notes="phase3 curated priority seed",
            )
            parsed = parse_judgment_xml(payload["xml"])
            existing_count = count_documents_by_source_id(seed.identifier, domain=seed.domain or None)
            insert_summary = insert_judgment_document(
                parsed,
                domain=seed.domain or None,
                source_url=payload["source_url"],
                fetched_at=payload["fetched_at"],
                parser_version=parser_version,
            )
            if existing_count > 0 and insert_summary.inserted == 0:
                warning = f"Judgment {seed.identifier} domain={seed.domain} already existed; row was refreshed in place."
                warnings.append(warning)
                LOGGER.info(warning)
            _record_success(
                job_id=job.id,
                source_type=source_type,
                source_system=source_system,
                seed=seed,
                fetched_at=payload["fetched_at"],
                insert_summary=insert_summary,
            )
            success_count += 1
        except Exception as exc:
            error_message = str(exc)
            LOGGER.exception("Curated judgment ingestion failed for %s domain=%s", seed.identifier, seed.domain)
            _record_failure(
                job_id=job.id,
                source_type=source_type,
                source_system=source_system,
                seed=seed,
                error_message=error_message,
            )
            failure_count += 1

    status = "completed" if failure_count == 0 else "completed_with_errors"
    finalize_job(
        job.id,
        status=status,
        success_count=success_count,
        failure_count=failure_count,
    )
    return CuratedIngestionResult(
        job_id=job.id,
        source_type=source_type,
        source_system=source_system,
        domain=domain,
        total_items=len(seeds),
        success_count=success_count,
        failure_count=failure_count,
        dry_run=False,
        warnings=warnings,
    )
