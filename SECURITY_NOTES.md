# Security Notes

Clarvo uses Supabase as managed Postgres through server-side database URLs. The current app does not use `@supabase/supabase-js` in browser code, does not use Supabase Storage, and does not require a Supabase service-role key in the frontend.

## Environment Variable Placement

Server-only variables:

- `DATABASE_URL`: FastAPI/SQLAlchemy Postgres URL for the legal corpus, matters, user settings, ingestion jobs, and embeddings. Keep this on the backend runtime only.
- `AUTH_DATABASE_URL`: Next/Auth.js Postgres URL for authentication tables. Keep this on the frontend server runtime only; it must never be exposed to client components.
- `AUTH_SECRET` or `NEXTAUTH_SECRET`: shared signing secret used by Next/Auth.js and FastAPI bearer-token validation. Keep this server-side only and use the same value in both runtimes.
- `OPENAI_API_KEY`: backend-only model access key. Never prefix with `NEXT_PUBLIC_`.
- `RESEND_API_KEY`: Next server-only email provider key. Never prefix with `NEXT_PUBLIC_`.
- `CLARVO_OWNER_EMAILS` or `OWNER_EMAILS`: optional comma-separated owner allowlist for operator endpoints. If unset, the app falls back to the configured owner email in `api/auth.py`.

Public browser-safe variables:

- `NEXT_PUBLIC_API_BASE_URL`: public backend origin used by browser-side routes to reach the hosted FastAPI backend. This must contain no credentials.

Not currently required:

- `SUPABASE_SERVICE_ROLE_KEY`: not used by this app. If it is ever introduced for maintenance tooling, keep it server-only and never expose it in frontend code or `NEXT_PUBLIC_` variables.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / publishable key: not used because the browser does not call Supabase directly.

## Repo Hygiene

`.gitignore` ignores `.env*` and allows only `.env.example`. Do not commit `.env.local`, downloaded database dumps, local tmp files, or screenshots that contain credentials.

## Production Guardrails

- Production must set `NEXT_PUBLIC_API_BASE_URL`; the code now fails closed instead of silently falling back to localhost.
- Public signup and development bypass must remain disabled for controlled private beta.
- Supabase public tables must have RLS enabled. Tables without direct browser access should intentionally have no policies, which makes direct Supabase API access deny by default.
