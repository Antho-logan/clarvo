# Security Audit Report

Date: 2026-06-05

## Scope

Audited the Clarvo Supabase/Postgres integration, server authorization, env-var usage, upload handling, and current RLS posture. The app is a Next.js frontend plus FastAPI backend. Supabase is used as managed Postgres through server-side SQLAlchemy/Auth.js database connections, not through a browser Supabase client.

## Supabase Client Setup

- Browser Supabase client: none found.
- `@supabase/supabase-js`: none found.
- Supabase Storage usage: none found.
- Database access path: server-side `DATABASE_URL` and `AUTH_DATABASE_URL`.
- Frontend-to-backend path: Next.js routes sign backend requests with `AUTH_SECRET`; FastAPI verifies bearer JWTs in `api/auth.py`.

## Secret Audit

Search coverage included database URLs, Supabase keys, service-role keys, JWT/Auth secrets, OpenAI keys, Resend keys, Stripe keys, and public env prefixes. Findings:

- No Supabase service-role key usage found in app code.
- No browser Supabase client usage found.
- `.gitignore` already blocks `.env*` and allows `.env.example`.
- Secrets appear only as placeholders, docs examples, tests, or ignored local files.
- `NEXT_PUBLIC_API_BASE_URL` is the only public runtime backend config and must not contain credentials.

Hardening added:

- Production no longer silently falls back to `http://127.0.0.1:8000` when `NEXT_PUBLIC_API_BASE_URL` is missing.
- `SECURITY_NOTES.md` documents allowed env-var placement.

## Public Tables Found

From SQLAlchemy models and migrations:

- `documents`
- `ingestion_jobs`
- `ingestion_job_items`
- `source_registry`
- `users`
- `accounts`
- `sessions`
- `verification_token`
- `matter`
- `matter_documents`
- `matter_agent_runs`
- `user_settings`
- `alembic_version`

Live Supabase drift also showed:

- `research_notes`
- `research_memos`

Those two live tables are not represented in the current Alembic model path. Current app code stores saved research notes and memos inside `matter.tags`; review and either migrate or remove the live drift before relying on those tables.

## Supabase Advisor Findings

Read-only Security Advisor check found:

- `ERROR`: RLS disabled on `public.users`, `public.accounts`, `public.sessions`, `public.verification_token`, and `public.alembic_version`.
- `ERROR`: sensitive columns exposed on `public.accounts` and `public.verification_token` because RLS is disabled.
- `INFO`: several RLS-enabled tables have no policies. For shared/operator-only tables, no policy is intentional deny-by-default direct Supabase API access.
- `WARN`: `vector` extension was installed in the `public` schema. Follow-up migration `202606050002_move_vector_extension_schema.py` moves it to the `extensions` schema and updates vector search SQL to use the schema-qualified operator/type.

## RLS Migration Added

Added `migrations/versions/202606050001_enable_supabase_rls.py`.

The migration:

- Enables RLS on all modeled app/Auth.js tables and `alembic_version`.
- Adds ownership policies for `user_settings`.
- Adds ownership policies for `matter`.
- Adds ownership policies for `matter_documents` through the owning matter.
- Adds ownership policies for `matter_agent_runs` through the owning matter.
- Leaves corpus, ingestion, source registry, Auth.js tables, and Alembic metadata with no direct policies, which denies direct Supabase Data API access by default.

Important: RLS is not forced. Server-side DB-owner/pooled application connections continue normal operation, while direct anon/authenticated Supabase API access is restricted.

## Routes And Actions Audited

Authenticated user routes:

- `/documents`
- `/documents/{source_id}`
- `/laws/{bwb_id}`
- `/judgments/{ecli}`
- `/search`
- `/matters`
- `/matters/*`
- `/settings`
- `/ingestion/jobs`
- `/workflows`
- `/agent/stream`
- `/agent/extract-document`
- `/agent/chat`

Owner/operator routes hardened:

- `/ingest/laws`
- `/ingest/judgments`
- `/ingest/curated-law`
- `/ingest/curated-judgment`
- `/embeddings/coverage`
- `/embeddings/backfill`
- `/embeddings/reembed-stale`

Existing owner admin checks:

- Dashboard customer/admin server surfaces use server-side auth and owner-email checks.

## Input Validation Hardening

- FastAPI request models for settings, matters, agent requests, ingestion, and embedding jobs now reject unexpected fields.
- `/settings` no longer accepts client writes to operator-managed key-status fields.
- The Next.js document extraction route validates file size and supported file type before buffering and proxying to FastAPI.

## Storage Security

No Supabase Storage usage found. Document upload is ephemeral and proxied to FastAPI for text extraction. Current safeguards:

- Next.js proxy rejects files over 10 MB.
- Next.js proxy rejects unsupported upload types.
- FastAPI extraction also validates file type and size.

If Supabase Storage is added later, add private buckets and owner-scoped storage policies before launch.

## Unresolved Risks

- Apply the new RLS migration and rerun Supabase Security Advisor. The advisor errors remain live until migration is applied.
- Review the live-only `research_notes` and `research_memos` tables. Add modeled migrations/policies or remove them if they are obsolete.
- SQLAlchemy reflection may report `extensions.vector` as an unknown type during tests; direct Postgres `format_type` checks verify the column remains `extensions.vector(1536)`.
- Server DB credentials bypass non-forced RLS. Keep all DB URLs server-only.
- If a future browser Supabase client is added, design policies against the actual Supabase Auth identity model before exposing any table.

## Manual Test Cases

- Anonymous user cannot read private data through Supabase REST/Data API.
- User A cannot read, update, or delete User B matter/settings rows through Supabase REST/Data API.
- Browser cannot write `openai_key_configured`, `cohere_key_configured`, role, owner, or user_id fields through app routes.
- Owner-only ingestion and embedding endpoints return `403` for non-owner authenticated users.
- Service-role or secret key is absent from frontend bundle and public env vars.
- Oversized/unsupported document uploads are rejected before backend extraction.

## Apply Migration

Use the normal Alembic path from a trusted machine or deployment job with the server-side database URL set:

```bash
DATABASE_URL="<server-side postgres URL>" python3 -m alembic upgrade head
```

Do not paste or commit the URL. After applying, rerun Supabase Security Advisor and verify no RLS-disabled public-table errors remain.
