# Milestone 1 Runbook

## What Was Implemented

- Deterministic official-source client for one BWB law fetch.
- Deterministic official-source client for one Rechtspraak judgment fetch.
- XML parser for BWB article/lid structure.
- XML parser for Rechtspraak metadata and body text.
- Milestone-1-safe persistence fields and indexes on the existing `documents` table.
- End-to-end smoke test and minimal search sanity check.

## Required Environment Variables

- `DATABASE_URL`
- `HTTP_TIMEOUT_SECONDS` optional, default `30`
- `USER_AGENT` optional, default `veridicta-milestone1/1.0`
- `PARSER_VERSION` optional, default `milestone1-v1`
- `BWB_BASE_URL` optional, default `https://repository.officiele-overheidspublicaties.nl/BWB`
- `RECHTSPRAAK_BASE_URL` optional, default `https://data.rechtspraak.nl/uitspraken/content`

## How To Run

1. Start PostgreSQL and create a database.
2. Export `DATABASE_URL`.
3. Run the schema init:

```bash
python init_db.py
```

4. Run the end-to-end smoke test:

```bash
python smoke_tests/milestone1_smoke_test.py
```

5. Run the search sanity check:

```bash
python smoke_tests/search_sanity_check.py
```

## Known Limitations

- Only one-law and one-judgment fetch flows are implemented.
- No bulk ingestion, SRU updates, crawlers, schedulers, or EU sources.
- Legislation persistence stores one row per article/lid when possible; it does not yet preserve the full structural hierarchy.
- Search sanity uses direct PostgreSQL full-text checks only.
- Embeddings remain optional and are not required for milestone 1.

## Intentionally Deferred

- Bulk legislation ingestion.
- Rechtspraak crawling or search feeds.
- Incremental updates and resumable jobs.
- Workflow and orchestration changes.
- Ranking improvements beyond the existing scaffold.

## Recommended Milestone 2

Add controlled bulk ingestion for curated sets of BWBR laws and curated Rechtspraak ECLI lists, with resumable fetch state and source-level audit logging.
