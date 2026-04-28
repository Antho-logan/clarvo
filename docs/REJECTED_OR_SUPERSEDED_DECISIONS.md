# Rejected or Superseded Decisions

This file exists so decisions that have been debated, settled, and closed do not get reopened. If a planning doc, a ticket, or a prompt proposes something on this list, the answer is no without further discussion.

---

## Rejected outright

### Supabase migration
**Rejected.** The path is self-hosted PostgreSQL with pgvector. All schema lives in Alembic migrations. All vector work lives in `documents.embedding vector(1536)` with an HNSW `vector_cosine_ops` index. Supabase auth, Supabase storage, Supabase-hosted Postgres, and Supabase edge functions are all off the table for this MVP.

Reason: we have a working self-hosted stack, migrations, CI matrix on Postgres 15/16, and a tuned retrieval path. Migrating buys nothing for the current user goal and forfeits tuning we already paid for.

### Agent-framework replacement in this phase
**Rejected.** `agentic_orchestrator.py` + `tools/retrieval.py` is the grounded-assistant implementation. Swapping in LangGraph, LlamaIndex, or similar is out of scope until corpus quality and citation quality are trusted. The current orchestrator enforces grounded sources, returns `insufficient_sources` instead of hallucinating, and is covered by tests.

### Broad feature expansion before corpus growth
**Rejected.** No new product surfaces (uploads, OCR, exports, generated documents, full workflow catalog, full matter workspace depth) until the three priority domains have real corpus volume, populated embeddings, and a clean eval signal. Expanding surface area on a thin corpus produces a polished product that cannot answer questions — that is the failure mode we are explicitly avoiding.

### `LEGAL_FALLBACK_TERMS` rescue hack
**Removed and rejected.** The previous orchestrator retried retrieval with a hardcoded list of generic Dutch legal terms when a query returned zero hits. This masked retrieval failure as retrieval success and let the assistant answer from irrelevant sources. It is deleted. Do not reintroduce any similar "retry with a broader query" rescue unless it is explicitly tied to user intent and covered by an eval.

### Hand-rolled schema in `init_db.py`
**Superseded.** Alembic owns schema. `init_db.py` is vestigial and kept only so legacy scripts do not fail. Do not add new columns or indexes in `init_db.py`; add an Alembic revision.

---

## Superseded planning artifacts

### `CODEX_FIX_PLAN.md` and `CODEX_FIX_PLAN_FOLLOWUP.md`
**Superseded.** Both described a ten-phase upgrade prompt. The work has landed on `codex/upgrade-to-10`, and the files were removed in the final code-finish cleanup.

### `docs/next_codex_target.md`
**Superseded.** Described a resolved domain-filter bug.

### `docs/upgrade_final.md`
**Superseded.** Quoted 47.88% coverage; the CI gate now enforces ≥ 80% and is green.

### `docs/upgrade_progress.md`
**Superseded.** April 19 point-in-time snapshot folded into `CURRENT_STATE_OF_TRUTH.md`.

### `docs/live_issues_todo.md`, `docs/live_validation_report.md`, `docs/content_quality_notes.md`, `docs/AGENT_CHECK.md`
**Superseded.** Historical issue tracking. The current state lives in `CURRENT_STATE_OF_TRUTH.md`; code-finish is closed in `REMAINING_CODE_WORK.md`.

### `docs/milestone1_runbook.md`, `docs/milestone2_runbook.md`, `docs/frontend_backend_integration_runbook.md`
**Superseded.** The only runbooks that survive are `docs/mvp_finish_runbook.md` (MVP check flow) and `docs/embedding_lifecycle_runbook.md` (embedding operations).

---

## Deferred by design (not rejected, just not now)

These are acceptable targets in a later phase. They are not remaining code work today.

- **Corpus expansion beyond ~18 BWB IDs per priority domain.** Waits on a separate content-curation phase.
- **Judgment corpus past ~1,200 ECLIs.** Waits on the same phase.
- **Embedding backfill at volume.** Waits on `OPENAI_API_KEY` and corpus expansion.
- **Reranker / cross-encoder pass.** Only meaningful once the base retrieval has real volume and a trustworthy eval signal.
- **Redis-cached query embeddings.** Micro-optimization; defer.
- **Immigration law and SME business law as corpus-expansion targets.** Seeds exist; expansion is not scheduled.
- **EU law ingestion (EUR-Lex).** Out of scope for this MVP.
- **Enterprise auth (SSO, RBAC, per-tenant isolation).** Out of scope for this MVP.
- **Uploads, OCR, exports, generated documents.** Out of scope for this MVP.
- **Full matter workspace depth, full workflow catalog.** Intentionally limited-preview.

---

## The rule

If a new idea is not locked in by `CURRENT_STATE_OF_TRUTH.md` and not explicitly scheduled in `NEXT_PHASE_BRIEF.md`, it is not in scope. `REMAINING_CODE_WORK.md` is a closure marker, not a backlog.
