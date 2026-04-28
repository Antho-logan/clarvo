# Embedding Coverage Report — Initial

**Date:** 2026-04-27 22:30 UTC
**Status:** Pre-backfill baseline

## Summary

| Metric | Count |
|--------|-------|
| Total documents | 0 |
| With embedding | 0 |
| Pending | 0 |
| Coverage | 0% |

Database was empty at time of initial report. Ingestion ran after this baseline was captured.

## Post-Ingestion Counts (manual)

| source_type | domain | count |
|-------------|--------|-------|
| legislation | employment_law | 5,893 |
| legislation | tenancy_law | 3,706 |
| case_law | employment_law | 50 |
| **TOTAL** | | **9,649** |

| Metric | Count |
|--------|-------|
| Total documents | 9,649 |
| With embedding | 0 |
| Pending | 9,649 |
| Failed | 0 |
| Stale | 0 |
| Coverage | **0%** |

## Blocker

The OpenAI project (`proj_c9lk8wQO4SkvDNiJ3acV6xNr`) does **not** have access to `text-embedding-3-small`. 
Embedding creation is blocked until:
- The project is granted access to an embedding model, OR
- A different OpenAI project/key with embedding access is used

Only model available: `gpt-4o-mini` (chat).
