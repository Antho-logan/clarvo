# Project Memory

This file stores durable project context for future agents.

Keep it concise. Update it only when something important changes.

## Current Stack

- **Frontend:** Next.js 16 (React 19, TypeScript, Tailwind v4, Radix UI, Framer Motion)
- **Backend:** FastAPI + SQLAlchemy + PostgreSQL + pgvector
- **AI:** OpenAI (embeddings via OpenAI API)
- **Run commands:**
  - Frontend: `npm run dev` (port 3003)
  - Backend: `python -m uvicorn api.main:app --host 0.0.0.0 --port 8000`
  - DB: `brew services start postgresql@17`
- **Env vars:** `DATABASE_URL` (postgresql://antho@localhost/veridicta_m1)
- **Smoke tests:** `smoke_tests/milestone1_smoke_test.py`, `smoke_tests/search_sanity_check.py`

## Project Structure

```
veridicta/
├── src/app/          # Next.js app router pages
├── src/components/   # UI components
├── src/lib/          # Client-side utilities, API client
├── api/main.py       # FastAPI backend
├── backend_common.py # Shared DB/logging utilities
├── search.py         # BM25 search logic
├── ingestion/        # Document ingestion pipelines
├── parsers/          # XML parsers (BWB, rechtspraak)
├── repositories/     # Database access layer (SQLAlchemy)
├── sources/          # Source API clients (BWB, rechtspraak)
├── config/           # Config files
├── docs/             # Project docs
├── docs/agent/       # Agent workflow prompts (THIS FOLDER)
├── smoke_tests/      # End-to-end smoke tests
└── evals/            # Evaluation scripts
```

## Key Routes/Pages

- `/dashboard/agents` — Agent dashboard (current bug: domain filter returns empty)
- `/dashboard/knowledge` — Knowledge base view
- `/dashboard/documents` — Document management
- Backend: `POST /ingest/curated-law`, `POST /ingest/curated-judgment`, search endpoint

## Current Known Issues

- ~~Domain filter bug on `/dashboard/agents`~~ — FIXED (2026-05-02): example prompt links now pass the domain parameter, so clicking "Focus: Tenancy Law" correctly searches within tenancy_law instead of all domains.
- Example queries on agents page: all BM25 queries return hits (verified: huurcontract/ontslag/bezwaar/bestuurder all return 5 hits in their respective domains).

## Important Architecture Notes

- PostgreSQL used as both OLTP and vector store (pgvector extension)
- BM25 search used for legal document retrieval (not pure vector search)
- Ingestion pipeline: BWB (wetten.nl) + Rechtspraak.nl sources
- Frontend talks to backend via `src/lib/api.ts`
- Stable user ID pattern must be used — not mutable email

## Environment Variables

- `DATABASE_URL` — Required. Format: `postgresql://antho@localhost/veridicta_m1`

## Key Decisions

- This project follows AGENT_NATIVE.md.
- Agents must use spec-first, invariant-first, verification-first workflow.
- Minimal diffs are preferred.
- Security, maintainability, and verification are mandatory.
- Do not touch authentication/user flows unless explicitly tasked.
- Do not modify backend search.py or BM25 implementation unless explicitly tasked.
- Current next target: keep repo structure, tooling, corpus state, and docs aligned before expanding the MVP surface.

## Known Risks

- pgvector + BM25 hybrid search may need tuning for recall
- Corpus expansion is planned (see `docs/next-phase/corpus_expansion_plan.md`).
- Local dependency state should not be committed. If `node_modules/.bin/*` is copied instead of symlinked, remove `node_modules` and run `npm install` again.

## Last Updated

2026-05-06 — Repo hygiene pass: added project map, docs index, tooling excludes, and local scratch policy.
