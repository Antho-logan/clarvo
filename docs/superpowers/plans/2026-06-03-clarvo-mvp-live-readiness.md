# Clarvo MVP Live Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the polished Clarvo app MVP-ready for controlled private beta by connecting the correct UI repo to production auth, a hosted FastAPI backend, and a hosted pgvector legal corpus database.

**Architecture:** Keep `Antho-logan/clarvo` branch `ui-polish-session` as the current source of truth. The Next.js frontend stays on Vercel and proxies assistant/document/matter requests through server-side API routes. FastAPI runs as a separate hosted backend with its own hosted PostgreSQL + pgvector database containing the legal corpus, embeddings, matters, notes, and memos. Auth remains separate through `AUTH_DATABASE_URL` for Auth.js users.

**Tech Stack:** Next.js 16, React 19, Auth.js, Vercel, FastAPI, Uvicorn, SQLAlchemy, Alembic, PostgreSQL + pgvector, OpenAI embeddings/chat, pytest, Vitest.

---

## Current State Summary

- Current polished app repo: `/Users/antho/Desktop/clarvo`
- Current GitHub repo: `https://github.com/Antho-logan/clarvo`
- Current source branch: `ui-polish-session`
- Latest pushed commit: `275f3b7 Restore assistant thinking animation`
- Local frontend works: `http://localhost:3000`
- Local backend works: `http://127.0.0.1:8000`
- Local backend health: `{ "status": "ok" }`
- Local legal DB contains `14,346` documents and `14,346` embeddings.
- Real local RAG works through the polished UI repo.
- Refusal path works with zero fake citations.
- Legal Review Mode works with `[Contract D1.P1]` references.
- Untracked `tmp/` contains promo video artifacts and must not be committed.
- Local `.env.local` is ignored and must not be committed.
- Local Vercel link for `/Users/antho/Desktop/clarvo` now points to project `antho-logans-projects/clarvo`.
- Production deployment history still shows Git source `Antho-logan/veridicta`, branch `main`.
- Production `NEXT_PUBLIC_API_BASE_URL` currently resolves to `http://127.0.0.1:8000`, which cannot support live RAG on Vercel.
- Production env names exist, but sensitive values are encrypted/write-only; only safe values should be verified via runtime smoke or dashboard.

## File/Component Map

- Frontend backend proxy: `src/lib/backend-proxy.ts`
- Frontend backend base URL: `src/lib/api/base-url.ts`
- Backend JWT signing: `src/lib/server-auth-token.ts`
- Assistant proxy route: `src/app/api/agent/stream/route.ts`
- Document extraction proxy route: `src/app/api/agent/extract-document/route.ts`
- Matter note/memo proxy routes: `src/app/api/matters/research-notes/route.ts`, `src/app/api/matters/research-memos/route.ts`
- Auth DB config: `src/lib/auth-db.ts`
- Owner admin workflow: `src/lib/admin-customers.ts`, `src/app/admin/customers/page.tsx`, `src/app/admin/customers/actions.ts`
- Dashboard protection: `src/middleware.ts`
- FastAPI backend: `api/main.py`
- Backend auth dependency: `api/auth.py`
- RAG orchestrator: `agentic_orchestrator.py`
- Hybrid retrieval: `search.py`
- Shared SQLAlchemy models/db helpers: `backend_common.py`
- Migrations: `migrations/versions/*`
- Existing live todo: `docs/LIVE_RAG_BACKEND_TODO.md`
- Deployment docs: `docs/DEPLOYMENT_CHECKLIST.md`

---

### Task 1: Make Repo/Deployment Source Of Truth Explicit

**Files:**
- Inspect: `/Users/antho/Desktop/clarvo/.git/config`
- Inspect: `/Users/antho/Desktop/VERIDICTA-full/.vercel/project.json`
- Modify if needed: Vercel project Git settings, not repo code.
- Do not commit: `tmp/`, `.env.local`, `.vercel/` unless intentionally needed and safe.

- [ ] **Step 1: Confirm the correct source repo and branch**

Run:

```bash
cd /Users/antho/Desktop/clarvo
git status --short --branch
git remote -v
git remote show origin
git log --oneline -5
```

Expected:

```text
## ui-polish-session...origin/ui-polish-session
origin https://github.com/Antho-logan/clarvo.git
HEAD branch: ui-polish-session
275f3b7 Restore assistant thinking animation
```

- [ ] **Step 2: Confirm untracked video artifacts are not staged**

Run:

```bash
cd /Users/antho/Desktop/clarvo
git status --short
```

Expected:

```text
?? tmp/
```

Do not stage `tmp/`. If we want to keep promo assets, move them later into a deliberate docs/demo media folder and commit only after review.

- [x] **Step 3: Decide Vercel Git source**

Decision:

```text
Use `Antho-logan/clarvo`, branch `ui-polish-session`, as the current source of truth.
```

Reason: `Antho-logan/clarvo` has the correct name, current UI, real RAG proxy path, and restored assistant thinking animation.

- [x] **Step 4: Link local checkout to Vercel after the Git source decision**

Completed locally:

```bash
cd /Users/antho/Desktop/clarvo
npx vercel link --yes --project prj_Ltjp6Zx5RrOuhpmb6enWXHGbNyU9
cat .vercel/project.json
```

Observed project metadata, with no secrets:

```json
{"projectName":"clarvo"}
```

Do not commit `.vercel/` unless we intentionally decide to track project metadata.

- [ ] **Step 5: Switch Vercel Git integration to the new repo**

Current Vercel production deployment metadata still shows:

```text
githubRepo: veridicta
githubCommitRef: main
latest production SHA: 2b439a3a4c5aaf8ba69aa3a01662ba4e73919d96
```

Required dashboard action:

```text
Vercel project clarvo -> Settings -> Git -> Connected Git Repository
Switch from Antho-logan/veridicta to Antho-logan/clarvo.
Set production branch to ui-polish-session, or rename/merge ui-polish-session to main and use main.
```

Expected after switching:

```bash
cd /Users/antho/Desktop/clarvo
npx vercel list --status READY --format json
```

The latest production deployment metadata should show:

```text
githubRepo: clarvo
githubCommitRef: ui-polish-session
githubCommitSha: 275f3b7...
```

If the dashboard cannot switch the repo safely, use a manual CLI production deployment from `/Users/antho/Desktop/clarvo` as a temporary deploy only:

```bash
cd /Users/antho/Desktop/clarvo
npm run lint
npm run typecheck
npm test -- --run
npm run build
npx vercel --prod
```

This updates production once but does not fix future auto-deploys from Git.

---

### Task 2: Production Auth And Owner Access Gate

**Files:**
- Inspect: `src/auth.ts`
- Inspect: `src/lib/auth-db.ts`
- Inspect: `src/lib/admin-customers.ts`
- Inspect: `src/middleware.ts`
- Test: existing frontend tests and live browser checks.

- [ ] **Step 1: Check production env names without printing values**

Run after Vercel link is correct:

```bash
cd /Users/antho/Desktop/clarvo
npx vercel env ls production
```

Required names:

```text
AUTH_SECRET
AUTH_DATABASE_URL
AUTH_DEV_BYPASS
AUTH_ALLOW_CREDENTIAL_SIGNUP
RESEND_API_KEY
BETA_LEAD_TO
BETA_LEAD_FROM
AUTH_EMAIL_FROM
NEXT_PUBLIC_API_BASE_URL
```

Safe values required:

```text
AUTH_DEV_BYPASS=false
AUTH_ALLOW_CREDENTIAL_SIGNUP=false
```

Known issue:

```text
NEXT_PUBLIC_API_BASE_URL is currently http://127.0.0.1:8000 in production.
```

That value is valid for local development but invalid for live Vercel. It must be changed only after a hosted FastAPI backend is available.

- [ ] **Step 2: Verify live owner login**

Manual smoke:

```text
1. Open https://clarvo.nl/login
2. Log in with the owner account.
3. Confirm redirect/open to https://clarvo.nl/dashboard
4. Open https://clarvo.nl/admin/customers
5. Confirm owner can see Customers page.
```

Expected:

```text
Owner can access dashboard and /admin/customers.
```

- [ ] **Step 3: Verify logged-out dashboard protection**

Manual smoke in private/incognito browser:

```text
1. Open https://clarvo.nl/dashboard
2. Confirm redirect to /login?callbackUrl=/dashboard
3. Open https://clarvo.nl/admin/customers
4. Confirm redirect to /login?callbackUrl=/admin/customers
```

Expected:

```text
Dashboard and admin are not public.
```

- [ ] **Step 4: Verify non-owner admin block**

Manual smoke after creating a test customer:

```text
1. Log in as a non-owner customer.
2. Open /admin/customers.
```

Expected:

```text
User is blocked or redirected safely.
```

---

### Task 3: Hosted Backend Deployment

**Files:**
- Backend entry: `api/main.py`
- Requirements: `requirements-backend.txt`
- Backend auth: `api/auth.py`
- Frontend proxy: `src/lib/backend-proxy.ts`
- Frontend base URL: `src/lib/api/base-url.ts`

- [ ] **Step 1: Choose backend host**

Recommended MVP option:

```text
Render/Railway/Fly web service running FastAPI with persistent outbound network access.
```

Avoid deploying FastAPI as a Vercel frontend function for this MVP because the backend has Python dependencies, DB/vector search, streaming, and long-ish LLM calls.

- [ ] **Step 2: Configure backend service**

Backend start command:

```bash
python3 -m uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Backend install command:

```bash
python3 -m pip install -r requirements-backend.txt
```

Required backend environment variables:

```text
DATABASE_URL=<hosted RAG/app postgres URL, server-side only>
AUTH_SECRET=<same value as Vercel frontend AUTH_SECRET>
OPENAI_API_KEY=<server-side only>
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4.1
```

Optional backend environment variables:

```text
REDIS_URL=<only needed for queued ingestion/embedding jobs>
CELERY_RESULT_BACKEND=<optional; defaults to REDIS_URL>
```

- [ ] **Step 3: Confirm backend health after deploy**

Run:

```bash
curl -sS https://<backend-host>/health
```

Expected:

```json
{"status":"ok"}
```

If this fails, inspect backend logs for sanitized errors only:

```text
missing DATABASE_URL
missing AUTH_SECRET
database connection refused
relation does not exist
```

---

### Task 4: Hosted Legal Corpus Database

**Files:**
- Models: `backend_common.py`
- Migrations: `migrations/versions/*`
- Search: `search.py`
- Deployment docs: `docs/DEPLOYMENT_CHECKLIST.md`

- [ ] **Step 1: Provision hosted PostgreSQL with pgvector**

Required capabilities:

```text
PostgreSQL
pgvector extension
enough storage for 14,346 document rows + embeddings
EU region preferred
stable connection URL for FastAPI backend
```

Recommended MVP choices:

```text
Option A: Managed Postgres with pgvector on Railway/Render/Neon/Supabase, same region as backend if possible.
Option B: Self-hosted Postgres + pgvector on a small VPS if cost/control matters more than setup speed.
```

- [ ] **Step 2: Apply migrations to hosted DB**

Use a temporary local environment variable. Do not print the URL.

```bash
cd /Users/antho/Desktop/clarvo
export CLARVO_RAG_DATABASE_URL='<hosted postgres URL>'
DATABASE_URL="$CLARVO_RAG_DATABASE_URL" python3 -m alembic upgrade head
```

Expected:

```text
Alembic upgrade completes without dropping/resetting existing production data.
```

- [ ] **Step 3: Export local populated corpus**

Do not run embedding jobs. Dump the existing local DB that already has embeddings.

```bash
cd /Users/antho/Desktop/clarvo
mkdir -p tmp/db-migration
export CLARVO_LOCAL_RAG_DB='<local postgres URL from .env.local converted to postgresql:// if needed>'
pg_dump --format=custom --no-owner --no-acl --file=tmp/db-migration/clarvo-rag.dump "$CLARVO_LOCAL_RAG_DB"
```

Expected:

```text
tmp/db-migration/clarvo-rag.dump exists
```

- [ ] **Step 4: Restore corpus into hosted DB**

Run:

```bash
cd /Users/antho/Desktop/clarvo
export CLARVO_RAG_DATABASE_URL='<hosted postgres URL>'
pg_restore --no-owner --no-acl --clean --if-exists --dbname="$CLARVO_RAG_DATABASE_URL" tmp/db-migration/clarvo-rag.dump
```

Expected:

```text
Restore completes. Warnings about dropping non-existent objects are acceptable only if restore succeeds.
```

- [ ] **Step 5: Verify hosted corpus counts**

Run without printing DB URL:

```bash
cd /Users/antho/Desktop/clarvo
DATABASE_URL="$CLARVO_RAG_DATABASE_URL" python3 - <<'PY'
from sqlalchemy import create_engine, text
import os
engine = create_engine(os.environ['DATABASE_URL'])
with engine.connect() as conn:
    docs = conn.execute(text('select count(*) from documents')).scalar_one()
    embeddings = conn.execute(text('select count(*) from documents where embedding is not null')).scalar_one()
    completed = conn.execute(text("select count(*) from documents where embedding_status = 'completed'")).scalar_one()
    print('documents:', docs)
    print('embeddings:', embeddings)
    print('completed:', completed)
PY
```

Expected:

```text
documents: 14346
embeddings: 14346
completed: 14346
```

---

### Task 5: Wire Vercel Frontend To Hosted Backend

**Files:**
- `src/lib/api/base-url.ts`
- `src/lib/backend-proxy.ts`
- Vercel project env only.

- [x] **Step 1: Confirm current production backend URL**

Observed by pulling production env to a temporary file and deleting it:

```text
NEXT_PUBLIC_API_BASE_URL scheme: http
NEXT_PUBLIC_API_BASE_URL host: 127.0.0.1
```

This is a P0 blocker for live RAG. Vercel serverless functions cannot reach the local machine at `127.0.0.1:8000`.

- [ ] **Step 2: Add/update Vercel frontend backend URL after hosted backend exists**

Run after Vercel project link is correct:

```bash
cd /Users/antho/Desktop/clarvo
printf '%s' 'https://<backend-host>' | npx vercel env add NEXT_PUBLIC_API_BASE_URL production
```

If the key already exists, remove/recreate safely:

```bash
npx vercel env rm NEXT_PUBLIC_API_BASE_URL production --yes
printf '%s' 'https://<backend-host>' | npx vercel env add NEXT_PUBLIC_API_BASE_URL production
```

Expected:

```text
NEXT_PUBLIC_API_BASE_URL exists in Production and points to the hosted backend.
```

- [ ] **Step 3: Confirm shared AUTH_SECRET**

Frontend and backend must use the same `AUTH_SECRET`, because `src/lib/server-auth-token.ts` signs JWTs and `api/auth.py` verifies them.

Check only presence, never print value:

```bash
npx vercel env ls production | grep AUTH_SECRET
```

Expected:

```text
AUTH_SECRET exists in Vercel Production.
```

Backend host must also have `AUTH_SECRET` set to the same value.

- [ ] **Step 4: Redeploy frontend**

Run:

```bash
cd /Users/antho/Desktop/clarvo
npx vercel --prod
```

Expected:

```text
Deployment Ready
Production aliases include clarvo.nl and www.clarvo.nl
```

---

### Task 6: Live Product Smoke Pass

**Files:**
- No code changes expected unless smoke reveals bugs.
- Routes: `/`, `/login`, `/dashboard/agents`, `/dashboard/matters`, `/dashboard/documents`, `/admin/customers`.

- [ ] **Step 1: Public landing smoke**

Check:

```text
https://clarvo.nl loads
https://www.clarvo.nl works or redirects
SSL clean
Lead form submits
hello@clarvo.nl receives internal lead email
Submitter receives confirmation email
/login loads
/dashboard redirects to /login when logged out
```

- [ ] **Step 2: Live assistant smoke**

As logged-in owner, ask:

```text
Wat geldt bij opzegging van huur van woonruimte?
Wanneer is ontslag op staande voet geldig?
Wat geldt bij loondoorbetaling tijdens ziekte?
```

Expected:

```text
Grounded answer
Legal source trail visible
Citation cards visible
Needs lawyer review visible
```

- [ ] **Step 3: Live refusal smoke**

Ask:

```text
Kun je mijn volledige belastingaangifte doen?
```

Expected:

```text
Refusal/limitation
No fake legal citations
No source-trail trust UI
```

- [ ] **Step 4: Live Legal Review Mode smoke**

Use clause:

```text
Verhuurder mag de huurovereenkomst op elk moment beëindigen met een opzegtermijn van één maand, zonder opgave van reden.
```

Ask:

```text
Beoordeel deze bepaling voor een Nederlandse huurovereenkomst. Welke risico’s zie je?
```

Expected answer includes:

```text
[Contract D1.P1]
Korte conclusie
Contractpassage
Juridische regel
Risico
Aanbeveling
Bronnen/citaties
Juristencontrole vereist
```

- [ ] **Step 5: Matter/memo smoke**

Flow:

```text
1. Ask a grounded huurrecht question.
2. Click Save to Matter.
3. Open /dashboard/matters.
4. Confirm saved research note appears.
5. Draft research memo.
6. Confirm memo shows source trail and lawyer-review warning.
```

- [ ] **Step 6: Admin/customer smoke**

Flow:

```text
1. Owner opens /admin/customers.
2. Owner creates test customer.
3. Temporary password is shown once.
4. Test customer logs in.
5. Test customer can open /dashboard.
6. Test customer cannot open /admin/customers.
```

---

### Task 7: Verification Commands Before Final MVP Claim

**Files:**
- Frontend tests: `src/__tests__/*`
- Backend tests: `tests/*`

- [ ] **Step 1: Frontend verification**

Run:

```bash
cd /Users/antho/Desktop/clarvo
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

Expected:

```text
lint passes
typecheck passes
Vitest passes
Next build passes
```

- [ ] **Step 2: Backend focused verification**

Run:

```bash
cd /Users/antho/Desktop/clarvo
python3 -m pytest tests/test_assistant_grounding.py -q
python3 -m pytest tests/test_document_text_extraction.py -q
```

Expected:

```text
assistant grounding tests pass
document extraction tests pass
```

- [ ] **Step 3: Backend full verification with test DB**

Run only if local test DB is available:

```bash
cd /Users/antho/Desktop/clarvo
TEST_DATABASE_URL=postgresql+psycopg://antho@localhost:5432/veridicta_test python3 -m pytest -q
```

Expected:

```text
Full pytest suite passes.
```

---

### Task 8: Remaining Docs/Runbook Cleanup

**Files:**
- Modify: `docs/CURRENT_STATE_OF_TRUTH.md`
- Modify: `docs/MVP_LAUNCH_TODO.md`
- Modify: `docs/DEPLOYMENT_CHECKLIST.md`
- Modify: `docs/LIVE_RAG_BACKEND_TODO.md`

- [ ] **Step 1: Update docs after hosted backend is live**

Docs should say:

```text
Clarvo has public landing + protected dashboard.
Full RAG is available only after hosted backend and hosted pgvector smoke pass.
Clarvo is still private beta.
Clarvo is not a lawyer replacement.
Clarvo is not public self-serve SaaS.
```

- [ ] **Step 2: Add failure runbook**

Add a short section covering:

```text
Backend unavailable: check backend /health and NEXT_PUBLIC_API_BASE_URL.
Auth failure: check AUTH_DATABASE_URL, AUTH_SECRET, AUTH_DEV_BYPASS=false.
No citations: check hosted DB document/embedding counts.
OpenAI failure: check OPENAI_API_KEY and backend logs.
Matter save failure: check backend DATABASE_URL and matter tables.
```

- [ ] **Step 3: Verify docs diff**

Run:

```bash
cd /Users/antho/Desktop/clarvo
git diff --check
```

Expected:

```text
No whitespace errors.
```

---

## Execution Order

1. Task 1: Repo/deployment source-of-truth decision.
2. Task 2: Production auth sanity check.
3. Task 4: Hosted legal corpus database.
4. Task 3: Hosted FastAPI backend.
5. Task 5: Wire frontend to backend and redeploy.
6. Task 6: Live product smoke pass.
7. Task 7: Full verification.
8. Task 8: Docs/runbook cleanup.

## MVP-Ready Definition

Clarvo is MVP-ready for controlled private beta when all of this is true:

```text
clarvo.nl landing works.
Lead capture works.
Owner login works.
Dashboard is protected.
Hosted backend /health works.
Hosted DB has 14,346 documents and 14,346 embeddings.
Live assistant answers huurrecht/arbeidsrecht questions with citations.
Live unsupported/tax/German/criminal questions refuse without fake citations.
Live Legal Review Mode returns [Contract D1.P1] and legal citations.
Save to Matter works live.
Draft memo works live.
Owner can create customers.
Non-owner cannot access /admin/customers.
Docs honestly say private beta, not lawyer replacement, not public self-serve.
Frontend and backend verification pass.
```

## Caveats

- Do not run embedding jobs unless explicitly approved.
- Do not commit `.env.local`, DB URLs, API keys, or `tmp/` video artifacts.
- Do not enable `AUTH_DEV_BYPASS` or `AUTH_ALLOW_CREDENTIAL_SIGNUP` in production.
- Hosted full RAG will not be truly production-ready until the hosted DB migration and live smoke pass are complete.
