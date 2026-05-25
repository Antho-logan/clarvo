# Supabase Embedding Skill — Risk Register

**Date:** 2026-04-21
**TL;DR:** Supabase is the wrong tool for this specific problem at this stage. The risks below explain why.

---

## Risk Summary

| # | Risk | Severity | Likelihood | Status |
|---|------|----------|------------|--------|
| R1 | Vendor lock-in | High | High | Open |
| R2 | Vector search latency regression | Medium | High | Open |
| R3 | RLS misconfiguration | High | Medium | Open |
| R4 | Embedding model switch mid-flight | High | Low | Open |
| R5 | Service role key exposure | Critical | Low | Open |
| R6 | pgvector extension version mismatch | Medium | Low | Open |
| R7 | Supabase connection pooler compatibility | Medium | Medium | Open |
| R8 | Cost at scale | Medium | Medium | Open |
| R9 | Data residency / compliance | Medium | Low | Open |
| R10 | Complexity creep | Medium | High | Open |

---

## R1 — Vendor Lock-In

**Severity:** High
**Likelihood:** High

Supabase is a managed service. Once the database is on Supabase, every operational change — schema migration, index rebuild, connection troubleshooting — goes through Supabase's tooling or requires their support.

**Specific failure modes:**
- Supabase changes pricing tiers → Clarvo must pay more or migrate
- Supabase deprecates a feature (e.g., PgBouncer configuration) → Breaking change with no local recourse
- Supabase has a prolonged outage → Clarvo is down with no ability to intervene
- Team wants to migrate away later → Full database migration required (non-trivial)

**Mitigation:** Stay on self-hosted Postgres. The current stack handles the workload fine. Vendor lock-in is only acceptable when the vendor provides something irreplaceable (e.g., Auth, Storage, Realtime as a bundle). For vector storage, pgvector on self-hosted Postgres is not replaceable by Supabase — it's the same thing with extra steps.

---

## R2 — Vector Search Latency Regression

**Severity:** Medium
**Likelihood:** High

Clarvo's Postgres currently runs locally (docker-compose, same machine or same LAN). Vector search latency is currently ~20-80ms.

Supabase-hosted Postgres adds network round-trip time to Supabase's cloud region. Even if the app is deployed to the same cloud region (e.g., EU West), the added latency for each vector search query will be measurable.

**Specific failure modes:**
- App deployed on Vercel (US East) + Supabase (EU West) → 100-200ms added latency per query
- Hybrid search fires 2 queries (BM25 + vector) → Latency compounds
- User-facing search feels sluggish → Poor UX

**Mitigation:** If a managed Postgres is desired, evaluate AWS RDS or Google Cloud SQL (both offer pgvector) in the same region as the app deployment. These are still managed, but give more control over region and instance sizing. Alternatively, self-hosted on a cheap VPS in the same region.

---

## R3 — Row Level Security Misconfiguration

**Severity:** High
**Likelihood:** Medium

Supabase enables Row Level Security (RLS) by default on all tables. Clarvo's current schema has **no RLS policies** — all data is effectively public within the database.

**Specific failure modes:**
- After migrating to Supabase, all queries return zero rows (RLS blocks everything) if RLS is not disabled
- If RLS is naively disabled for convenience (`ALTER TABLE documents DISABLE ROW LEVEL SECURITY`), the database loses its access control layer entirely — any compromise of a service account gives full read/write to all data
- Proper RLS policies must be written for each table based on `auth.uid()` from Supabase Auth — this requires significant schema changes to add user_id columns to tables that don't currently have them (e.g., `documents`)

**Mitigation:** Either disable RLS (acceptable for a single-tenant or internal app where all users have equal access to all documents) or budget time to properly implement RLS. The `documents` table is shared legal data — it likely doesn't need RLS for document reads (all users can read all documents). RLS matters for `matter`, `user_settings`, and similar user-scoped tables.

---

## R4 — Embedding Model Switch Mid-Flight

**Severity:** High
**Likelihood:** Low

If embedding model switching is automated (e.g., agent decides to switch from `text-embedding-3-small` to `text-embedding-3-large`), and this updates `documents.embedding` column while search requests are in flight, queries will compare vectors from different models — producing meaningless similarity scores.

**Specific failure modes:**
- Agent switches active model via automated pipeline
- Search request that was in-flight before the switch uses old vector for query embedding
- Results returned are semantically incoherent
- This can happen silently with no error

**Mitigation:** The model switch procedure (Section 6 in runbook) includes a transactional approach with a reference column. Never update `documents.embedding` without a full stop on search requests, or use a model-specific column (`embedding_openai`, `embedding_cohere`) and route queries explicitly.

---

## R5 — Supabase Service Role Key Exposure

**Severity:** Critical
**Likelihood:** Low

The Supabase service role key bypasses all RLS policies. If this key is ever exposed client-side (e.g., in browser code, in a misconfigured environment variable, in a log file), an attacker has full admin access to the entire database.

**Specific failure modes:**
- Key committed to GitHub
- Key logged by error-tracking service
- Key sent to Slack/Teams by mistake

**Mitigation:**
- Store in `.env.local` (already the practice for `OPENAI_API_KEY`)
- Never prefix with `NEXT_PUBLIC_` (this exposes it to browsers)
- Supabase Vault (for additional secret management) adds complexity but improves security
- Audit access: enable Supabase's built-in connection/invocation logs

---

## R6 — pgvector Extension Version Mismatch

**Severity:** Medium
**Likelihood:** Low

Clarvo currently uses `pgvector/pgvector:pg17` in docker-compose. Supabase uses a managed version of pgvector that may be at a different minor version.

**Specific failure modes:**
- `vector_cosine_ops` HNSW index creation fails if Supabase's pgvector version doesn't support it (unlikely but possible on very old versions)
- SQL functions behave differently across versions (e.g., `vector_dims()` introduced in v0.5.0)
- Hybrid query performance differs if the query planner behaves differently

**Mitigation:** Check Supabase's current pgvector version before migration: `SELECT extversion FROM pg_extension WHERE extname = 'vector';`. Compare against the current self-hosted version. Review Supabase's release notes for breaking changes.

---

## R7 — Connection Pooler Compatibility

**Severity:** Medium
**Likelihood:** Medium

Supabase uses PgBouncer as a connection pooler in front of Postgres. The connection string port changes from `5432` (direct Postgres) to `6543` (PgBouncer).

**Specific failure modes:**
- `sslmode=require` must be set explicitly — Supabase rejects non-SSL connections to PgBouncer
- PgBouncer "transaction mode" pooling is incompatible with some SQLAlchemy patterns (prepared statements, `SET` commands, advisory locks)
- Connection timeout errors if PgBouncer is overwhelmed
- `pg_notify` (used for some async notification patterns) doesn't work through PgBouncer

**Mitigation:**
- Use the Supabase connection string from the dashboard which includes the correct port and SSL settings
- Verify SQLAlchemy connection pooling settings are compatible with PgBouncer transaction mode
- Test under load before going to production

---

## R8 — Cost at Scale

**Severity:** Medium
**Likelihood:** Medium

Clarvo's document corpus will grow. At current trajectory:

| Documents | Embedding Storage (1536 dims, float32) | Supabase Tier Needed |
|-----------|----------------------------------------|----------------------|
| 10,000 | ~240MB | Free / Pro ($25/mo) |
| 100,000 | ~2.4GB | Pro ($25/mo) + overage |
| 1,000,000 | ~24GB | Team tier ($599/mo) |

Plus compute costs for any Supabase Edge Functions or other Supabase services.

**Mitigation:** Self-hosted Postgres on a $20-40/month VPS easily handles millions of documents. Supabase's free tier is fine for development. Budget for Supabase costs if the team decides the management benefits are worth it — but don't conflate "Supabase for embeddings" with "Supabase is free."

---

## R9 — Data Residency / Compliance

**Severity:** Medium
**Likelihood:** Low

Dutch legal documents may have data residency requirements depending on the use case (e.g., client data under Dutch law, GDPR considerations).

**Specific failure modes:**
- Supabase's default region may not be in the Netherlands (EU West = Ireland by default)
- Storing Dutch legal documents in a different jurisdiction may conflict with client contractual terms
- GDPR data subject requests require data export/deletion — Supabase's tooling helps here but adds process

**Mitigation:** Verify Supabase project region. Supabase supports EU regions. If data residency is a hard requirement, confirm Supabase's EU region meets the contractual requirements before migrating.

---

## R10 — Complexity Creep

**Severity:** Medium
**Likelihood:** High

The "embedding skill" framing undersells the actual scope. This is not a skill — it is:

- A database migration (if Supabase is used)
- A new Celery task architecture (for async embedding)
- A new schema (for embedding lifecycle)
- A new multi-model abstraction (for future embedding providers)
- New operational procedures (monitoring, rollback, coverage reporting)

**Specific failure modes:**
- The team builds the "embedding skill" and discovers it requires full infrastructure work
- Operational runbooks are written but never tested
- The migration happens, something breaks, and the rollback plan has never been executed
- Months of work for an architecture that doesn't improve the core problem

**Mitigation:** Break this into separate decisions:
1. Embedding lifecycle schema — small, self-contained, low risk
2. Celery incremental embedding — medium, within existing infrastructure
3. Supabase migration — full project, separate decision with its own full migration plan

Do not conflate these into one "embedding skill." The complexity is not in the embeddings — it's in the infrastructure decision.

---

## Recommendations

### Immediate (Do Now, Within Existing Stack)

- **R1, R10:** Ignore Supabase as an embedding solution. It doesn't add vector capability that pgvector doesn't already provide.
- **R3:** If RLS is a concern, add it within the existing Postgres — no need to migrate to Supabase for this.
- **R4, R10:** Build the embedding lifecycle schema (Section 3 of design doc) as a single Alembic migration. This addresses the real problem (embedding staleness, coverage, incremental updates) with minimal complexity.

### Medium Term (Separate Projects)

- **R8:** If cost becomes a concern, evaluate managed Postgres providers (AWS RDS, Google Cloud SQL) as direct replacements for self-hosted, not Supabase specifically.
- **R2:** If latency is proven to be a problem (measure first, before assuming), optimize within the existing stack (connection pooling, query optimization, index tuning) before migrating.
- **R7:** If PgBouncer-style pooling is needed, add it to the existing self-hosted Postgres.

### Not Recommended

- **R1, R2, R8:** Do not migrate to Supabase specifically for vector storage. The benefit is marginal and the risks are real.

---

*Risks were evaluated based on current Clarvo architecture (docker-compose Postgres, no RLS, single-tenant legal document storage). These assessments may change if the product evolves (multi-tenant, public SaaS, strict compliance requirements).*
