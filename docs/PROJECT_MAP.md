# Veridicta Project Map

This file explains where things live. Keep it current when adding a new top-level module, route family, data workflow, or operational document.

## Product Shape

Veridicta is a Dutch legal research assistant. The MVP is source-backed search, cited assistant answers, curated ingestion, and a dashboard for working with legal sources. It is not yet a full practice-management suite.

## Runtime Areas

| Area | Path | Purpose |
|---|---|---|
| Next.js app | `src/app/` | App Router pages, route handlers, layouts, and dashboard routes. |
| React components | `src/components/` | Shared UI, dashboard components, landing page sections, providers, and layout pieces. |
| Frontend libraries | `src/lib/` | Typed API client, display helpers, auth token utilities, copy, and small shared functions. |
| Frontend tests | `src/__tests__/`, `src/lib/__tests__/` | Vitest tests for pages, components, streams, and small utilities. |
| FastAPI backend | `api/` | API app, auth dependencies, OpenAPI snapshot, and backend route surface. |
| Shared backend model | `backend_common.py` | Environment loading, SQLAlchemy models, database sessions, embedding constants, and shared helpers. |
| Search | `search.py` | BM25, vector, and hybrid retrieval logic. |
| Assistant orchestration | `agentic_orchestrator.py` | Grounded answer flow, lookup tools, citations, and refusal behavior. |
| Ingestion | `ingestion/` | Celery app, ingestion tasks, and curated law/judgment ingestion flows. |
| Source clients | `sources/` | BWB, Rechtspraak content, and Rechtspraak search clients. |
| Parsers | `parsers/` | XML parsing for law and judgment source documents. |
| Repositories | `repositories/` | Database persistence and query boundaries for documents, matters, settings, embeddings, and ingestion jobs. |
| Database migrations | `migrations/` | Alembic schema history. Do not use `init_db.py` for new schema work. |
| Evals | `evals/` | Retrieval evaluation cases, runners, baseline reports, and regression checks. |
| Backend tests | `tests/`, `smoke_tests/` | Pytest unit, integration, migration, search, parser, source-client, and smoke coverage. |
| Config and seeds | `config/` | Curated legal corpus seed definitions and legacy seed ID files. |
| Scripts | `scripts/` | Operational scripts such as embedding coverage reporting. |
| Docs | `docs/` | Current state, runbooks, project map, phase briefs, and operational reports. |

## Route Families

| Route | Purpose |
|---|---|
| `/` | Marketing/landing page. |
| `/login` | Magic-link login. |
| `/dashboard` | Authenticated dashboard home. |
| `/dashboard/knowledge` | Search interface for legal sources. |
| `/dashboard/documents` | Source list and document detail navigation. |
| `/dashboard/agents` | Source-backed assistant UI. |
| `/dashboard/matters` | Limited-preview matter workspace. |
| `/dashboard/workflows` | Limited-preview workflow list and run history. |
| `/dashboard/settings` | User and firm settings. |
| `/api/agent/stream` | Next.js proxy route for assistant SSE streaming. |

## Backend API Families

| API | Purpose |
|---|---|
| `/health` | Backend and database health check. |
| `/documents`, `/documents/{source_id}` | Legal source browsing. |
| `/search` | Hybrid legal search. |
| `/agent/chat`, `/agent/stream` | Grounded assistant responses. |
| `/ingest/*`, `/ingestion/jobs/*` | Queue and inspect ingestion jobs. |
| `/embeddings/*` | Queue embedding work and inspect coverage. |
| `/matters/*`, `/settings`, `/workflows/*` | Dashboard support surfaces. |

## Source-of-Truth Docs

| Doc | Use |
|---|---|
| `docs/CURRENT_STATE_OF_TRUTH.md` | Architecture decisions and verified project state. Update when reality changes. |
| `docs/NEXT_PHASE_BRIEF.md` | Current non-code phase: embeddings, corpus, evals, citation audit. |
| `docs/REMAINING_CODE_WORK.md` | Closure marker for code-finish. Do not turn it into a backlog. |
| `docs/embedding_lifecycle_runbook.md` | How to inspect and run embedding backfill safely. |
| `docs/mvp_finish_runbook.md` | Manual MVP check flow. |
| `docs/PROJECT_MAP.md` | This orientation map. |
| `docs/README.md` | Docs index and archive policy. |

## Planning And Archive Layout

| Folder | Use |
|---|---|
| `docs/next-phase/` | Active planning for corpus expansion, evals, embeddings, open questions, and agent operating model. |
| `docs/agent/` | Agent prompts and project memory. |
| `docs/archive/` | Historical briefings and rejected paths. Do not treat these as current architecture. |

## Local Scratch Policy

Generated local worktrees, recovered candidate folders, build output, caches, and dependency folders are not project source. Keep them out of TypeScript, Vitest, ESLint, and Git. If a candidate file becomes real product code, move only the useful part into the proper source path above.
