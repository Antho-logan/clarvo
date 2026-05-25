# Clarvo Deployment Checklist

Last updated: 2026-05-08.

This checklist is for private beta demo deployment. It is not a public self-serve production launch plan.

## Recommended Path For Today

Use **Option B: public landing page on Vercel, backend local/private for demos**.

Reason:

- The landing page is static/server-rendered Next.js and can be deployed quickly.
- The authenticated app depends on a populated PostgreSQL + pgvector database with 14,346 embedded documents.
- The backend requires live OpenAI and database access for assistant answers.
- Full app deployment is feasible, but should be staged after database hosting, secrets, auth, and backend runtime are confirmed.

## Deployment Options

| Option | Description | Recommended now |
| --- | --- | --- |
| A | Local demo only | Safe, already working, but not public |
| B | Landing public on Vercel, backend local/private | Yes |
| C | Full app deploy in one step | Not today |
| D | Staged full deploy: backend on Railway/Render/Fly, frontend on Vercel | Next step after landing |

## Frontend

Framework:

- Next.js 16
- React 19
- Auth.js / NextAuth beta

Commands:

```bash
npm install
npm run typecheck
npm test -- --run
npm run build
npm run start
```

Recommended Vercel settings for landing-only deployment:

- Framework preset: Next.js
- Build command: `npm run build`
- Output: default Next.js output
- Node version: use Vercel default compatible with Next 16, or Node 20+

Frontend environment variables:

```bash
DATABASE_URL=<postgres URL used by Auth.js if dashboard routes are enabled>
AUTH_SECRET=<long random secret>
NEXT_PUBLIC_API_BASE_URL=<deployed backend URL or private backend URL>
AUTH_DEV_BYPASS=false
AUTH_ALLOW_CREDENTIAL_SIGNUP=false
AUTH_EMAIL_FROM=Clarvo <auth@your-domain>
RESEND_API_KEY=<only if magic-link login should work>
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4.1
```

Notes:

- If deploying landing-only, dashboard routes can remain protected behind login, but `DATABASE_URL` is still used by Auth.js when login/dashboard routes render.
- Set `AUTH_DEV_BYPASS=false` in every hosted environment.
- Never treat dashboard routes as public pages. With `AUTH_DEV_BYPASS=false`, unauthenticated `/dashboard` requests must redirect to `/login`; with `AUTH_DEV_BYPASS=true`, local browsers can enter the dashboard with a demo identity and sign-out only returns to the landing page.
- Do not expose `OPENAI_API_KEY` to browser-side variables. It must never be prefixed with `NEXT_PUBLIC_`.

## Backend

Framework:

- FastAPI
- Uvicorn
- SQLAlchemy
- PostgreSQL + pgvector
- Celery for queued ingestion/embedding jobs

Install:

```bash
python3 -m pip install -r requirements-backend.txt
```

Start command:

```bash
python3 -m uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Backend environment variables:

```bash
DATABASE_URL=<postgresql+psycopg://... URL>
AUTH_SECRET=<same value as frontend AUTH_SECRET>
OPENAI_API_KEY=<server-side only>
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4.1
REDIS_URL=<redis://... only needed for queued ingestion/embedding workers>
CELERY_RESULT_BACKEND=<optional; defaults to REDIS_URL>
```

Backend port:

- Local default: `8000`
- Hosted backend should bind to `0.0.0.0` and the platform-provided `PORT`.

Important:

- `api.main` does not currently configure browser CORS.
- The Next frontend calls the backend through server-side API proxy routes, so CORS is not needed for the current app shape.
- If a browser client ever calls FastAPI directly from another origin, add a tightly scoped CORS policy first.

## Database

Required:

- PostgreSQL
- `pgvector` extension
- Current migrations applied through Alembic
- Populated legal corpus
- Completed embeddings

Setup commands:

```bash
python3 -m alembic upgrade head
python3 scripts/embedding_coverage_report.py --refresh
```

Current verified local target state:

- 14,346 documents
- 14,346 embeddings completed
- 0 pending
- 0 failed
- model: `text-embedding-3-small`
- dimensions: `1536`

For hosted full-app deployment, either:

- migrate the existing populated database to a managed PostgreSQL + pgvector provider, or
- run ingestion and embedding backfill in the hosted database after explicit approval.

Do not run embedding jobs during deployment unless explicitly approved.

## Redis / Workers

Redis is required only for:

- queued curated ingestion jobs
- queued embedding lifecycle jobs
- Celery result backend if enabled

Redis is not required for:

- landing page
- existing source-backed assistant queries
- search against already embedded documents
- Save to Matter
- Draft research memo

Worker command:

```bash
python3 -m celery -A ingestion.celery_app.celery_app worker --loglevel=INFO
```

For private beta demo, do not expose ingestion or embedding jobs to non-admin users.

## Auth And Production Safety

Must not be enabled in production:

```bash
AUTH_DEV_BYPASS=true
AUTH_ALLOW_CREDENTIAL_SIGNUP=true
```

Production auth requirements:

- `AUTH_SECRET` must be a long random value.
- Frontend and backend must use the same `AUTH_SECRET`.
- `RESEND_API_KEY` is required only if magic-link email sign-in should work.
- If `RESEND_API_KEY` is not configured, password login can still work for existing credential users.
- Seed or create beta users deliberately; do not leave open signup enabled.

## Secrets Handling

- Store secrets only in the deployment platform secret manager.
- Never commit `.env`, `.env.local`, API keys, database passwords, or auth secrets.
- Never print `OPENAI_API_KEY`, `AUTH_SECRET`, `RESEND_API_KEY`, or database credentials in logs.
- Keep `OPENAI_API_KEY` server-side only.

## Production Base URLs

Frontend:

```bash
NEXT_PUBLIC_API_BASE_URL=https://<backend-host>
```

Backend:

- No frontend-origin CORS is needed while frontend API routes proxy all backend calls.
- If direct browser-to-FastAPI calls are introduced, add a narrow `CORSMiddleware` allowlist for the exact frontend origin.

Auth:

- Configure the deployment host/trust settings according to the Auth.js platform guidance.
- Keep `trustHost: true` only with a trusted deployment platform and correct external URL configuration.

## Smoke Tests After Deploy

Landing:

```bash
curl -I https://<frontend-host>/
curl -I https://<frontend-host>/login
```

Backend:

```bash
curl https://<backend-host>/health
```

Dashboard:

1. Open `/login`.
2. Sign in with a seeded beta account.
3. Open `/dashboard/agents`.
4. Ask: `Wat geldt bij opzegging van huur van woonruimte?`
5. Confirm grounded answer with citations.
6. Save answer to Matter.
7. Open `/dashboard/matters`.
8. Confirm saved research note appears.
9. Draft research memo.
10. Confirm memo appears with `Lawyer review required`.
11. Ask: `Kun je mijn volledige belastingaangifte doen?`
12. Confirm refusal / insufficient coverage, 0 citations, and not saveable.

Knowledge:

1. Open `/dashboard/knowledge`.
2. Search: `huur woonruimte`.
3. Confirm source results render and source links open.

## Known Non-Blocking Warnings

- Next.js may warn about inferred workspace root because another lockfile exists above the repo.
- Next.js warns that the `middleware` convention should migrate to `proxy`.
- Tailwind config may warn about module type.

These are not current deployment blockers for the MVP demo.

## Blockers Before Full Public Production

- Hosted PostgreSQL + pgvector must contain the verified corpus and embeddings.
- `AUTH_DEV_BYPASS` must be disabled in Vercel and every hosted environment.
- Open signup must be disabled unless intentionally managed.
- Secrets must be configured only in platform secret storage.
- Backend runtime must have `OPENAI_API_KEY` and database access.
- Direct browser-to-backend calls require explicit CORS allowlist before launch.
- Legal disclaimer must remain visible on the landing page and product surfaces.
