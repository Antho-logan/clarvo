# Milestone 2 Runbook

## What Milestone 2 Adds

Milestone 2 extends the milestone-1 proof into a curated Dutch legal retrieval backend for five starter domains:

- tenancy law
- employment law
- administrative law
- immigration law
- SME business law

Implemented additions:

- curated repo-owned BWB seed lists
- curated repo-owned Rechtspraak seed lists
- bulk-but-curated ingestion scripts for laws and judgments
- ingestion job tracking and per-item audit logging
- resumable and retryable ingestion via prior job items
- minimal FastAPI endpoints for health, documents, search, and ingestion jobs
- starter retrieval evaluation set

The existing milestone-1 source clients, parsers, DB persistence, and search path are reused rather than replaced.

## Environment Variables

Required:

- `DATABASE_URL`

Optional:

- `HTTP_TIMEOUT_SECONDS` default `30`
- `USER_AGENT` default `veridicta-milestone1/1.0`
- `PARSER_VERSION` default `milestone1-v1`
- `BWB_BASE_URL` default `https://repository.officiele-overheidspublicaties.nl/BWB`
- `RECHTSPRAAK_BASE_URL` default `https://data.rechtspraak.nl/uitspraken/content`

## Install Dependencies

```bash
cd /Users/antho/Desktop/veridicta/veridicta
python3 -m pip install --user -r requirements-backend.txt
```

## Initialize or Upgrade the Database

```bash
cd /Users/antho/Desktop/veridicta/veridicta
export DATABASE_URL='postgresql+psycopg://localhost:55432/veridicta_m1'
python3 init_db.py
```

This is additive and safe to rerun. It creates or upgrades:

- `documents`
- `ingestion_jobs`
- `ingestion_job_items`
- `source_registry`

## Curated Seed Lists

Starter seeds live in:

- `config/seed_bwbr_ids.json`
- `config/seed_eclis.json`

These are intentionally small curated starters, not exhaustive domain coverage.

## Run Curated Law Ingestion

All domains:

```bash
cd /Users/antho/Desktop/veridicta/veridicta
export DATABASE_URL='postgresql+psycopg://localhost:55432/veridicta_m1'
python3 -m ingestion.ingest_curated_laws
```

Single domain:

```bash
python3 -m ingestion.ingest_curated_laws --domain employment_law
```

Limit selection:

```bash
python3 -m ingestion.ingest_curated_laws --domain tenancy_law --limit 1
```

Dry run:

```bash
python3 -m ingestion.ingest_curated_laws --domain tenancy_law --limit 1 --dry-run
```

Retry failed or incomplete items from an earlier job:

```bash
python3 -m ingestion.ingest_curated_laws --resume-job-id 34 --domain administrative_law
```

## Run Curated Judgment Ingestion

All domains:

```bash
cd /Users/antho/Desktop/veridicta/veridicta
export DATABASE_URL='postgresql+psycopg://localhost:55432/veridicta_m1'
python3 -m ingestion.ingest_curated_judgments
```

Single domain:

```bash
python3 -m ingestion.ingest_curated_judgments --domain tenancy_law
```

Dry run:

```bash
python3 -m ingestion.ingest_curated_judgments --domain tenancy_law --limit 1 --dry-run
```

Retry failed or incomplete items from an earlier job:

```bash
python3 -m ingestion.ingest_curated_judgments --resume-job-id 2
```

## Run the API Locally

```bash
cd /Users/antho/Desktop/veridicta/veridicta
export DATABASE_URL='postgresql+psycopg://localhost:55432/veridicta_m1'
python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Useful endpoints:

- `GET /health`
- `GET /documents?source_type=legislation&domain=employment_law&limit=20`
- `GET /documents/BWBR0002638?domain=employment_law`
- `GET /search?q=minimumloon%20vakantiebijslag&source_type=legislation&domain=employment_law&limit=5`
- `POST /ingest/laws`
- `POST /ingest/judgments`
- `GET /ingestion/jobs`
- `GET /ingestion/jobs/{job_id}`

Example dry-run ingestion request:

```bash
curl -X POST http://127.0.0.1:8000/ingest/laws \
  -H 'Content-Type: application/json' \
  -d '{"domain":"tenancy_law","limit":1,"dry_run":true}'
```

## Run Starter Evals

```bash
cd /Users/antho/Desktop/veridicta/veridicta
export DATABASE_URL='postgresql+psycopg://localhost:55432/veridicta_m1'
python3 evals/run_milestone2_eval.py
```

## Known Limitations

- Seed lists are starter coverage only and need domain-expert expansion.
- Curated ingestion is synchronous and manually triggered.
- No SRU update support yet.
- No EU law ingestion yet.
- No broad Rechtspraak crawling or large-scale case filtering yet.
- No auth or background job queue on the API.
- Search remains PostgreSQL full-text first; there is no ranking overhaul here.
- For legislation, raw source XML is preserved on one anchor chunk per `(source_id, domain)` to avoid duplicating multi-megabyte XML on every article/lid row.

## What Is Intentionally Deferred

- SRU incremental update handling
- EU law ingestion
- schedulers and cron
- broad crawling
- freshness automation
- advanced ranking and retrieval tuning
- workflow-engine or agent rewrites

## Milestone 3 Recommendation

Milestone 3 should add source freshness and controlled updates:

- curated source expansion per domain
- persisted source version/change detection
- incremental refresh runs for seeded BWB and Rechtspraak sources
- retrieval-quality review with a larger hand-checked evaluation set
- lightweight auth and async/background execution for ingestion endpoints
