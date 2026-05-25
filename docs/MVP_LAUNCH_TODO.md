# MVP Launch Todo

Last updated: 2026-05-21

This file tracks small MVP blockers and follow-ups that should not interrupt the current build flow.

## Open

### Remaining operational launch tasks

Status: active.

MVP definition:
- Private demo / beta-candidate product.
- Not public self-serve production.
- Core promise: login works, assistant answers supported Dutch legal questions, citations are inspectable, and useful answers can be saved into matter work.

2026-05-21 QA result:
- No P0 product blockers remain after the local MVP QA pass.
- Product smoke items are tracked in the completed QA section below.

Open operational tasks before Vercel / 28 May:

1. Verify the company sender/domain in Resend.
2. Set hosted Vercel env vars:
   - `AUTH_SECRET`
   - `AUTH_DEV_BYPASS=false`
   - `AUTH_ALLOW_CREDENTIAL_SIGNUP=false`
   - `AUTH_EMAIL_FROM="Clarvo <hello@clarvo.nl>"`
   - `NEXT_PUBLIC_API_BASE_URL`
   - `RESEND_API_KEY`
   - `BETA_LEAD_TO`
   - `BETA_LEAD_FROM`
3. Deploy the landing/app shell to Vercel.
4. Submit one real landing lead form and confirm the internal email arrives at `BETA_LEAD_TO` and the submitter receives the confirmation email.
5. Run one controlled live Legal Review Mode smoke before the demo.
6. For the full app, provision hosted FastAPI plus a populated hosted PostgreSQL/pgvector database. Landing-only deployment does not prove the full RAG app is production-hosted.

P1 tasks that can wait until after the core demo works:
- Improve assistant streaming animation so answer chunks feel smoother.
- Polish the login screen design.
- Define a repeatable manual user-provisioning command/script.

P2 tasks intentionally deferred beyond MVP:
- Full user-management dashboard.
- Public self-serve signup.
- Active workflow automation runner.
- Large dashboard redesign.

Current surface decision:
- `Workflows` remains roadmap-only for MVP. Do not build real automation there before the Assistant, Knowledge, Vault, and Matters flows are proven.

Local smoke commands:

```bash
npm run dev -- --port 3001
python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8000
curl http://127.0.0.1:8000/health
```

### User account provisioning

Status: intentionally deferred.

Decision:
- Do not build a full user-management dashboard before MVP.
- For MVP, use manually provisioned/invited users in the existing auth database.
- Keep `AUTH_DEV_BYPASS=false` outside throwaway local preview sessions.

Next action:
- Before real customer testing, define the minimal manual user-provisioning command or script.
- Before public launch, replace manual provisioning with a proper invite/account flow.

### Demo request email delivery

Status: locally verified with Resend sandbox sender on 2026-05-20.

Current state:
- The landing page demo form posts to `/api/beta-access`.
- `RESEND_API_KEY`, `BETA_LEAD_TO`, and `BETA_LEAD_FROM` are read from `.env.local`.
- A personal inbox is acceptable for `BETA_LEAD_TO` during testing.
- `BETA_LEAD_FROM` must be a sender that Resend allows. A normal Gmail address fails as the sender.
- Receiving mail at Hostnet proves `hello@clarvo.nl` can receive mail, but Resend still must verify the domain/sender before it can send from `hello@clarvo.nl`.
- Local smoke with `Clarvo <onboarding@resend.dev>` returned `200 {"ok":true}` through `/api/beta-access`.

Next action:
- Temporary testing before Resend domain verification:
  - `BETA_LEAD_TO=hello@clarvo.nl`
  - `BETA_LEAD_FROM="Clarvo <onboarding@resend.dev>"`
  - `AUTH_EMAIL_FROM="Clarvo <onboarding@resend.dev>"`
- Before launch, verify the company domain in Resend and set `BETA_LEAD_FROM` to the real Clarvo sender, ideally `Clarvo <hello@clarvo.nl>`.
- Final production after Resend verifies `clarvo.nl`:
  - `BETA_LEAD_TO=hello@clarvo.nl`
  - `BETA_LEAD_FROM="Clarvo <hello@clarvo.nl>"`
  - `AUTH_EMAIL_FROM="Clarvo <hello@clarvo.nl>"`
- Required hosted env vars: `RESEND_API_KEY`, `BETA_LEAD_TO`, `BETA_LEAD_FROM`, `AUTH_EMAIL_FROM`.
- Restart/redeploy after changing env vars.
- Submit the landing form and confirm the lead email arrives at `BETA_LEAD_TO` and the submitter receives the confirmation email.
- Local direct smoke command: `npm run smoke:resend -- user@example.com`.

### 2026-05-20 P0 launch blocker pass

Status: verified locally.

Results:
- Auth safety: `.env.example` now defaults `AUTH_DEV_BYPASS=false` and `AUTH_ALLOW_CREDENTIAL_SIGNUP=false`; local `.env.local` was also set to credential signup disabled.
- DB integration: `TEST_DATABASE_URL=postgresql+psycopg://antho@localhost:5432/veridicta_test python3 -m pytest tests/test_matters_repo.py tests/test_api_endpoints.py -q` returned `40 passed`; full `python3 -m pytest -q` with the same test DB returned `132 passed`.
- Lead capture: personal sender failed with `502`; Resend sandbox sender succeeded through the local route with `200 {"ok":true}`.
- Live Legal Review Mode: one uploaded-clause review returned `grounded`, 8 citations, `[Contract D1.P1]`, and the required legal-review headings.

## Done

### 2026-05-21 full local MVP QA after document review UX polish

Status: completed locally. No P0 product blockers found.

Automated verification:
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm test -- --run` passed with 44 tests.
- `npm run build` passed.
- `python3 -m pytest tests/test_assistant_grounding.py -q` passed with 9 tests.
- `python3 -m pytest tests/test_document_text_extraction.py -q` passed with 4 tests.
- `TEST_DATABASE_URL=postgresql+psycopg://antho@localhost:5432/veridicta_test python3 -m pytest -q` passed with 134 tests.

Manual QA covered:
- Landing loads Dutch-first.
- Mobile language toggle works.
- Demo CTA opens the lead form.
- Lead route returned `200 {"ok":true}` with a fake local QA payload and configured Resend env.
- `AUTH_DEV_BYPASS=false` redirects `/dashboard` to `/login`.
- `/login` loads and public signup is not visible.
- Dashboard, Assistant, Matters, Knowledge, Documents/Vault, Workflows, Settings, and Onboarding load in dev/demo mode.
- Backend health is live on `127.0.0.1:8000`.
- UI Sandbox is not visible in normal navigation.
- Workflows says roadmap/preview only.
- Knowledge search and Documents/Vault browsing/detail routes load.
- Matters shows source-trail and lawyer-review language.

Skipped during this QA pass:
- A fresh live OpenAI Legal Review Mode call was skipped to avoid unnecessary API use. Run one controlled live clause review immediately before the demo.

Operational caveat:
- Full public app launch still requires hosted FastAPI plus a populated hosted PostgreSQL/pgvector database. A Vercel landing/app-shell deploy alone is not a full hosted RAG deployment.

### Login CTA should open the login screen

Status: fixed locally on 2026-05-19.

Current state:
- The landing page links `Inloggen` / `Sign in` to `/login`.
- `/login` exists.
- Dashboard preview is open locally because `AUTH_DEV_BYPASS=true`.

Expected state:
- Pressing `Inloggen` should show the login screen, not immediately jump to the dashboard.
- Dashboard access rules should remain handled by middleware/layout.

Verification:
- `/login` returns 200 locally.
- `/login` renders the sign-in form while `AUTH_DEV_BYPASS=true`.

### Local MVP credential login

Status: fixed locally on 2026-05-19.

Current state:
- `AUTH_DEV_BYPASS=false` in local `.env.local`, so dashboard routes require authentication again.
- `AUTH_DEMO_LOGIN_NAME="Anthony Logan"` maps the visible login name to the internal auth email.
- The local Postgres `users` row has been seeded with a password hash.
- The login form accepts `Name or email` for password login.

Local test credential:
- Login name: `Anthony Logan`
- Password: `login`

Verification:
- Fresh browser request to `/dashboard` redirects to `/login?callbackUrl=%2Fdashboard`.
- Submitting `Anthony Logan` + the local password reaches `/dashboard`.
- Dashboard greeting renders `Good evening, Anthony.`

Before launch:
- Set `AUTH_DEV_BYPASS=false` in every hosted environment.
- Set `AUTH_ALLOW_CREDENTIAL_SIGNUP=false` unless there is an explicit invite/account flow.
- Replace the local MVP credential with real account provisioning.

### Assistant RAG smoke test

Status: fixed locally on 2026-05-19.

Issue:
- The assistant UI returned an internal server error because the Next.js app was running but the FastAPI backend on `127.0.0.1:8000` was not running.

Fix:
- Start the backend with:

```bash
python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Verification:
- `GET http://127.0.0.1:8000/health` returned `{"status":"ok"}`.
- Logged in as `Anthony Logan`.
- Opened `/dashboard/agents?q=Wat%20geldt%20bij%20opzegging%20van%20huur%20van%20woonruimte%3F&domain=tenancy_law`.
- `/api/agent/stream` returned `200 OK`.
- Backend logs showed BM25 retrieval, vector retrieval, hybrid merged hits, and `assistant status=grounded sources=8`.
- The assistant UI rendered tenancy-law source citations including `BWBR0005290` articles and one Rechtspraak ECLI result.

Operational note:
- For local MVP testing, run both servers:

```bash
npm run dev -- --port 3001
python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

### German-law refusal regression

Status: fixed locally on 2026-05-19.

Issue:
- A German employment-law prompt was translated into a Dutch employment-law answer and returned Dutch citations.
- Root cause: the unsupported-question guard only matched a few Dutch phrases such as `duits arbeidsrecht`, and it only ran when no domain was selected.

Fix:
- Expanded explicit German-law jurisdiction patterns.
- Run unsupported-question detection before domain-scoped retrieval.

Verification:
- Backend regression test covers the exact German prompt with `domain="employment_law"`.
- Browser check through `/dashboard/agents` now shows `Not enough supporting sources`.
- Backend log reports `assistant status=insufficient_sources sources=0`.
