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
