# MVP Launch Todo

Last updated: 2026-05-19

This file tracks small MVP blockers and follow-ups that should not interrupt the current build flow.

## Open

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
