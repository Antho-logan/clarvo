# MVP Launch Todo

Last updated: 2026-05-19

This file tracks small MVP blockers and follow-ups that should not interrupt the current build flow.

## Open

### MVP finish board

Status: active.

MVP definition:
- Private demo / beta-candidate product.
- Not public self-serve production.
- Core promise: login works, assistant answers supported Dutch legal questions, citations are inspectable, and useful answers can be saved into matter work.

P0 tasks to finish before calling the MVP demo-ready:

1. Dashboard smoke pass
   - Verify login lands on `/dashboard`.
   - Verify the dashboard shows `Backend live` when both local servers are running.
   - Verify source count, practice-area links, and latest source links load without error.
   - If the dashboard says `Backend offline` while `/health` is OK, fix that status logic.

2. Assistant answer and refusal pass
   - Run the three safe demo questions:
     - `Wat geldt bij opzegging van huur van woonruimte?`
     - `Wanneer is ontslag op staande voet geldig?`
     - `Wat geldt bij loondoorbetaling tijdens ziekte?`
   - Run refusal checks:
     - German labor law question.
     - Tax return question.
     - Criminal pretrial detention question.
   - Required result: supported questions return grounded answers with citations; unsupported questions return insufficient-source/refusal behavior with zero fake citations.
   - 2026-05-19 update: German employment-law prompt now refuses even when the employment domain is selected:
     `Welche Kündigungsfristen gelten im deutschen Arbeitsrecht für einen Arbeitnehmer mit fünf Jahren Betriebszugehörigkeit?`

3. Citation click-through pass
   - From an assistant answer, open at least one BWB citation.
   - Open at least one ECLI/Rechtspraak citation when present.
   - Required result: citation links land on the correct Vault/document detail page and show usable source text.

4. Knowledge search pass
   - Search the Knowledge page for `opzegging huur`, `ontslag op staande voet`, and `loondoorbetaling ziekte`.
   - Test domain filters for tenancy and employment.
   - Required result: results load, counts make sense, and top hits can be opened.

5. Vault/document pass
   - Open `/dashboard/documents`.
   - Filter or browse stored documents.
   - Open a document detail page.
   - Required result: document metadata and text preview are visible.

6. Matters and memo pass
   - Create a test matter.
   - Save a grounded assistant answer to a matter.
   - Open `/dashboard/matters` and confirm the saved research note appears with citations.
   - If the memo button is available for that note, draft a research memo and confirm it persists.
   - Required result: no broken save, reload, or citation display path.

7. Settings/onboarding pass
   - Open `/dashboard/settings`.
   - Save a harmless setting such as display name or firm name.
   - Confirm there is no onboarding redirect loop.

P1 tasks that can wait until after the core demo works:
- Improve assistant streaming animation so answer chunks feel smoother.
- Polish the login screen design.
- Make lead email delivery work with a verified Resend sender.
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

Status: blocked until sender setup is finalized.

Current state:
- The landing page demo form posts to `/api/beta-access`.
- `RESEND_API_KEY`, `BETA_LEAD_TO`, and `BETA_LEAD_FROM` are read from `.env.local`.
- A personal inbox is acceptable for `BETA_LEAD_TO` during testing.
- `BETA_LEAD_FROM` must be a sender that Resend allows. A normal Gmail address is expected to fail as the sender.

Next action:
- For a quick sandbox test, use a Resend-approved sender such as `Veridicta <onboarding@resend.dev>` if the Resend account permits it.
- Before launch, verify the company domain in Resend and set `BETA_LEAD_FROM` to the real Veridicta sender.
- Restart the local Next.js server after changing `.env.local`.
- Submit the landing form and confirm the lead email arrives at `BETA_LEAD_TO`.

## Done

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
