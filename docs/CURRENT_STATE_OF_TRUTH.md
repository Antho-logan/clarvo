# Veridicta — Current State of Truth

**Last verified:** 2026-04-27 against branch `codex/upgrade-to-10` after the final docs cleanup pass.
**Verification status:** local gate passed on 2026-04-27; draft PR CI was green before this docs-only cleanup.

This is the single source of truth. Everything else in `docs/` is historical. When a planning doc contradicts this file, this file wins.

---

## Architecture decisions locked in

| Decision | Status | Notes |
|---|---|---|
| Self-hosted PostgreSQL + pgvector | **Locked** | HNSW index on `documents.embedding` with `vector_cosine_ops`, built in migration `202604190002_enable_pgvector.py`. |
| Alembic owns schema | **Locked** | Seven migrations in `migrations/versions/`. `init_db.py` is vestigial and kept only so legacy scripts do not break. |
| FastAPI + Celery + Redis for ingestion | **Locked** | `ingestion/celery_app.py`, `ingestion/tasks.py`. All ingest endpoints are 202-enqueue, not synchronous. |
| NextAuth (Auth.js) + Resend magic link | **Locked** | `src/auth.ts` wires `Resend` when `RESEND_API_KEY` is set. `AUTH_DEV_BYPASS=false` is the committed default; only a local override. |
| OpenAI `text-embedding-3-small`, dim 1536 | **Locked** | Default in `backend_common.py`. Lifecycle metadata on `documents` tracks model/version/dimensions/source hash. |
| Supabase | **Rejected** | See `REJECTED_OR_SUPERSEDED_DECISIONS.md`. Self-hosted Postgres is the path. |
| Three priority domains only | **Locked for MVP** | employment, tenancy, administrative. Immigration and SME business law stay in seed files but are not corpus-expansion targets yet. |

---

## What is built (code, tested, CI-green)

### Backend
- **Schema and migrations.** Alembic with 7 revisions. `documents` table has full embedding lifecycle columns (`embedding_status`, `embedding_model`, `embedding_version`, `embedding_dimensions`, `embedding_source_hash`, `embedding_attempts`, `embedding_error`, `embedded_at`, `last_embedding_job_id`). Auth.js tables, `matter`, `user_settings`, `ingestion_jobs`, `ingestion_job_items`, `source_registry` all present and migration-managed.
- **Ingestion.** BWB client (`sources/bwb_client.py`) and Rechtspraak client (`sources/rechtspraak_client.py`) with rate limits and retry/backoff. Curated ingestion runs via Celery tasks (`ingestion/tasks.py`) with `autoretry_for=(Exception,)`, exponential backoff, `task_acks_late=True`, `worker_prefetch_multiplier=1`.
- **Retrieval.** SQL-native BM25 (`ts_rank_cd` + `websearch_to_tsquery('dutch', …)`), SQL-native vector search with a materialized `ann_candidates` CTE that widens to `max(limit*20, 100)` then post-filters by embedding lifecycle state. Hybrid fuses with normalized score sum. All filter pushdown (`source_type`, `domain`, `date_from`, `date_to`) happens in Postgres.
- **Embedding lifecycle.** `repositories/embeddings.py`. Deterministic SHA-256 source hashing, `classify_embedding_state` covers missing/stale/failed/skipped/completed transitions. Coverage report CLI (`scripts/embedding_coverage_report.py`) and API (`/embeddings/coverage`).
- **Grounded assistant.** `agentic_orchestrator.py` calls `KnowledgeLookupTool`, `CiteLookupTool`, and composes either an LLM answer (when `OPENAI_API_KEY` is set) or an extractive answer. Minimum grounded source threshold enforced. Refusal path returns `insufficient_sources` instead of hallucinating. `LEGAL_FALLBACK_TERMS` hack was removed.
- **API surface.** 31 endpoints in `api/main.py`: `/health`, `/documents`, `/documents/{id}`, `/search`, `/laws/{bwb_id}`, `/judgments/{ecli}`, `/matters/*`, `/settings`, `/workflows/*`, `/agent/chat`, `/agent/stream` (SSE), `/ingest/*` (all 202-enqueue), `/ingestion/jobs`, `/ingestion/jobs/{id}`, `/ingestion/jobs/{id}/stream` (SSE), `/embeddings/backfill`, `/embeddings/reembed-stale`, `/embeddings/coverage`. All dashboard endpoints gated by bearer JWT shared with NextAuth.

### Frontend
- **Dashboard shell.** `/dashboard/layout.tsx` with nav, auth gate, ⌘K command palette. Polished, consistent shadcn/Radix components.
- **Routes wired to live backend:** `/dashboard` (home), `/dashboard/knowledge`, `/dashboard/documents`, `/dashboard/documents/[sourceId]`, `/dashboard/agents`, `/dashboard/matters`, `/dashboard/workflows`, `/dashboard/settings`, `/dashboard/onboarding`.
- **Streaming assistant.** `/dashboard/agents` reads SSE from `/agent/stream` and progressively renders tokens + citation cards + refusal states.
- **Auth.** `/login` form + `/login/check-email` confirmation. Middleware gates `/dashboard/*`. `AUTH_DEV_BYPASS` supported as local-only override.
- **Typed API client.** `src/lib/api/` generated from `api/openapi.json` via `openapi-typescript`. Dashboard reads go through the typed client.

### Evals and tests
- **Retrieval eval harness.** `evals/curated_qa.yaml` (30 questions: 10 tenancy / 10 employment / 10 administrative). `evals/run_eval.py` computes per-domain `hit@10`, `mrr@10`, `recall@10`, writes JSON to `evals/results/latest.json`, exits non-zero below thresholds.
- **Legacy eval.** `evals/run_milestone2_eval.py` still runs P/R/F1/MRR/nDCG on the original seed set.
- **Pytest.** 109 tests pass. Coverage gate at `--cov-fail-under=80` for `repositories/`, `parsers/`, `sources/`, `search`, `api/`.
- **Vitest.** Frontend snapshot + behavior tests for dashboard home, knowledge empty state, document source label, login flow, assistant streaming.
- **CI.** `.github/workflows/ci.yml` matrix node 20/22 × python 3.11/3.12 × postgres 15/16 (pgvector). Evals gate job runs on PRs with its own Postgres + Redis services.

### Corpus state (as of the April 19 ingest pass)
- 13,112 legislation rows.
- 1,234 judgment rows (1,220 from the expanded Rechtspraak ingest + 14 from earlier).
- **0 embeddings populated.** Backfill is blocked on a local `OPENAI_API_KEY`.

---

## What is partially built

| Thing | State |
|---|---|
| Embedding backfill | Code path fully implemented; requires `OPENAI_API_KEY` to actually run. Zero rows have populated embeddings today. |
| Matters workspace | CRUD API + list page work. Rich linking (documents ↔ agent runs) is partial. Limited-preview UX is intentional for MVP. |
| Workflows page | List + run-history UI exists; there are only 2 demo flows registered in `workflow_engine.py`. Expansion to real flows is deferred to the data/quality phase. |
| Coverage-at-scale | Coverage gate is green at 80% today, but small-corpus artifacts mean nDCG@10 = 0.95 is not a trustworthy signal yet. Real signal waits on embedding + corpus expansion. |

---

## What is deferred by design

- Corpus expansion beyond the curated ~18 BWB IDs per priority domain.
- Judgment corpus past ~1,200 ECLIs.
- Embedding backfill at volume (waits on key + corpus).
- Reranker (cross-encoder pass over top-50).
- Redis-cached query embeddings.
- Broader workflow catalog.
- EU law ingestion.
- Enterprise auth (SSO, RBAC, per-tenant).
- Uploads, OCR, exports, generated documents.
- Full matter workspace depth.

---

## What is rejected / superseded

See `REJECTED_OR_SUPERSEDED_DECISIONS.md`. Summary: Supabase migration, broad feature expansion before corpus growth, and any agent-framework replacement in this phase are all explicitly off the table.

---

## Current phase

**Code-finish is complete.** The project has moved into corpus/embeddings/evals/citation audit. See `NEXT_PHASE_BRIEF.md` for what that means concretely.

`REMAINING_CODE_WORK.md` is now a closure marker, not a backlog. Do not reopen code-finish unless a verified broken issue is found in the current implementation.
