# Final Launch Checklist - 28 May Private Beta

Last updated: 2026-05-21.

Use this checklist after the code freeze. Do not add features while running this list.

## Pre-Vercel checklist

- Confirm the latest green commit is pushed to `origin/main`.
- Confirm the local working tree is clean.
- Confirm no product-code changes are planned before deploy.
- Confirm docs match the current product behavior.
- Confirm no secrets are committed.
- Confirm `.env.local` stays local and untracked.
- Confirm the demo script in `docs/FINAL_DEMO_SCRIPT.md` is rehearsed once.
- Confirm full public app caveat is understood: the hosted app needs hosted FastAPI plus populated hosted PostgreSQL/pgvector DB for full RAG behavior.

## Vercel env checklist

Required for production-like full app deploy:

- `AUTH_SECRET` set.
- `AUTH_DEV_BYPASS=false`.
- `AUTH_ALLOW_CREDENTIAL_SIGNUP=false`.
- `AUTH_EMAIL_FROM="Clarvo <hello@clarvo.nl>"`.
- `NEXT_PUBLIC_API_BASE_URL` points to the hosted backend URL.
- `RESEND_API_KEY` set.
- `BETA_LEAD_TO` set to the receiving inbox.
- `BETA_LEAD_FROM` set to a verified sender, ideally `Clarvo <hello@clarvo.nl>`.

Landing-only deploy:

- `RESEND_API_KEY` if the lead form should send email.
- `BETA_LEAD_TO` if the lead form should send email.
- `BETA_LEAD_FROM`, ideally `Clarvo <hello@clarvo.nl>`, if the lead form should send email.
- Auth/backend/database env can be absent only if the demo does not enter the full app.

## Resend checklist

- Receiving mail at Hostnet proves the mailbox works, but Resend still must verify the domain/sender before it can send from `hello@clarvo.nl`.
- Temporary testing before Resend domain verification:
  - `BETA_LEAD_TO=hello@clarvo.nl`
  - `BETA_LEAD_FROM="Clarvo <onboarding@resend.dev>"`
  - `AUTH_EMAIL_FROM="Clarvo <onboarding@resend.dev>"`
- Final production after Resend verifies `clarvo.nl`:
  - `BETA_LEAD_TO=hello@clarvo.nl`
  - `BETA_LEAD_FROM="Clarvo <hello@clarvo.nl>"`
  - `AUTH_EMAIL_FROM="Clarvo <hello@clarvo.nl>"`
- Verify the company sending domain or company sender.
- Set `BETA_LEAD_FROM` to that verified sender, ideally `Clarvo <hello@clarvo.nl>`.
- Send one real beta lead form submission after deploy.
- Confirm the internal notification arrives at `BETA_LEAD_TO` and the submitter receives the confirmation email.
- Keep sandbox sender only for local testing, not the final company-facing launch.

## Live smoke checklist

- Landing loads Dutch-first.
- NL/EN toggle works.
- Beta/demo lead form opens.
- Lead form submits and email arrives if Resend is configured.
- Inloggen goes to `/login`.
- `/dashboard` redirects when unauthenticated.
- Login/dev access works for the controlled demo account.
- Dashboard loads.
- UI Sandbox is not visible in normal navigation.
- Workflows page says preview/roadmap only.
- Assistant loads.
- Demo shortcuts fill the input and do not auto-submit.
- Huurrecht question returns a grounded answer with citations.
- Uploaded huur clause appears as current-chat contract context.
- Legal Review Mode answer includes `[Contract D1.P1]`.
- Legal Review Mode answer includes legal citations, risk, recommendation, and lawyer-review language.
- Save to Matter works for a grounded cited answer.
- Matter shows source trail and lawyer-review language.
- Draft memo flow works.
- Refusal demo does not show fake citations.

## Demo rehearsal checklist

- Rehearse the 30-second Dutch pitch.
- Rehearse the 2-minute flow once without stopping.
- Rehearse the 5-minute flow once with citations, upload, Matter, memo, and refusal.
- Keep the browser already logged in for the live demo if allowed.
- Keep the exact demo clauses ready in a local note.
- Do not improvise unsupported jurisdictions or broad legal domains.
- Do not promise lawyer replacement, full coverage, enterprise readiness, or public self-serve access.

## Rollback checklist

- If Vercel deploy fails, keep the last green local demo available.
- If the newest deployment is bad, use Vercel rollback to the last known good deployment.
- If lead email fails, keep the form visible but say sender/domain verification is being finalized.
- If full app backend is unavailable, demo landing plus prepared local app only.
- If RAG answers fail live, use refusal behavior as proof of safety and stop claiming live answer quality.
- Do not hotfix during the live demo unless the fix is already tested.

## Final freeze rules

- No new product features before the 28 May demo.
- No embedding jobs.
- No dependency changes.
- No auth changes.
- No landing redesign.
- No schema migration.
- No new jurisdictions.
- Only fix P0 breakages that block the demo.
- Any change after freeze must run the full verification suite again before deploy.
