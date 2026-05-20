# MVP Finish Runbook

## Scope

The MVP product surface is:

- Home dashboard
- Knowledge search
- Document vault
- Source detail
- Grounded assistant
- Login and one-screen onboarding
- Settings
- limited-preview Matters and Workflows

Deferred by design:

- EU law
- enterprise auth/RBAC
- full matter workspace
- full workflow execution UI
- permanent uploads, OCR, exports, and generated documents
- broad corpus expansion beyond the three priority domains

## Start Locally

```bash
cd /Users/antho/veridicta/.claude/worktrees/gallant-payne-a230e0
cp .env.example .env.local
brew services start redis
python3 -m alembic upgrade head
python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8000
python3 -m celery -A ingestion.celery_app.celery_app worker --loglevel=INFO
npm run dev -- -p 3003
```

Open:

- `http://localhost:3003/dashboard`
- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

## MVP Check Flow

1. Open `/login`.
2. Sign in with email/password, send a magic link, or use `AUTH_DEV_BYPASS=true` locally.
3. For a new real user, choose employment, tenancy, or administrative law on `/dashboard/onboarding`.
4. Land on `/dashboard/agents` with a starter query.
5. Confirm the assistant returns either:
   - `grounded` answer with citations, or
   - `insufficient_sources` refusal.
6. Attach a PDF, DOCX, or text contract excerpt in `/dashboard/agents` and confirm the follow-up answer uses the extracted current-chat document context without saving a permanent upload.
7. Open cited sources in `/dashboard/documents/[sourceId]`.
8. Search `/dashboard/knowledge?q=huur%20woonruimte&domain=tenancy_law`.
9. Inspect `/dashboard/documents`.
10. Confirm `/dashboard/matters` and `/dashboard/workflows` present limited-preview behavior, not fake full depth.

## Real Sign-In Setup

`AUTH_DEV_BYPASS` defaults to `false` and is only an explicit local preview override. For magic-link sign-in, set:

```bash
AUTH_SECRET=replace-with-a-long-random-local-secret
DATABASE_URL=postgresql+psycopg://...
RESEND_API_KEY=re_...
AUTH_EMAIL_FROM="Veridicta <auth@your-domain.example>"
```

Run `python3 -m alembic upgrade head` before testing auth so the Auth.js user and verification-token tables exist. Submitting the magic-link form on `/login` should route to `/login/check-email`; opening the emailed link should land the user on `/dashboard`.

## Verification Commands

```bash
python3 -m pytest -q
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

## Embedding Backfill Guardrails

Before retrieval quality testing on a larger corpus, populate pgvector embeddings in bounded pages:

```bash
python3 scripts/embedding_coverage_report.py --refresh
OPENAI_API_KEY=<your-openai-api-key> python3 create_embeddings.py --mode missing --limit 500 --page-size 100
```

The script skips blank document text, checkpoints after each stored batch, validates the returned vector width against `documents.embedding vector(1536)`, and records lifecycle metadata for coverage, stale detection, retries, and job audit. See `docs/embedding_lifecycle_runbook.md`.

Vector retrieval expects `idx_documents_embedding_hnsw` on `documents.embedding` with cosine operators. The index is created by `202604190002_enable_pgvector.py`. HNSW build on ~30 rows is instant; on 50k rows expect ~30s.

Known local caveats:

- Python DB integration tests skip when `TEST_DATABASE_URL` is not configured.
- Next may warn about multiple lockfiles above this worktree.
- Next may warn that `middleware` should migrate to `proxy`; that migration is not part of this MVP finish pass.
