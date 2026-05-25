# Supabase Embedding Skill — Plan

**Purpose:** Define exactly what a "Supabase embedding skill" should do, own, and not own for Clarvo's agents.

---

## What the Skill Is

A **build-and-ops skill** (not a pure dev skill) that automates the Supabase setup, migration, and ongoing embedding pipeline so that agents can:
1. Set up a new Supabase project for Clarvo
2. Configure the database schema (pgvector, tables, indexes)
3. Run the embedding backfill pipeline
4. Monitor and validate the vector search quality

The skill is NOT for writing application code. The application code already uses SQLAlchemy — it needs no Supabase-specific changes.

---

## Environment Variables the Skill Manages

```yaml
# ~/.hermes/skills/supabase-embedding/references/env_template.yaml
DATABASE_URL: "postgresql+psycopg://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
SUPABASE_URL: "https://[REF].supabase.co"
SUPABASE_ANON_KEY: "[ANON_KEY]"        # for REST API (future use)
SUPABASE_SERVICE_ROLE_KEY: "[SERVICE_KEY]"  # for admin ops only
OPENAI_API_KEY: "[OPENAI_KEY]"
EMBEDDING_MODEL: "text-embedding-3-small"  # do not change without eval evidence
EMBEDDING_BATCH_SIZE: "500"
EMBEDDING_CHECKPOINT_PATH: ".embedding_checkpoint.json"
```

**Security rule:** `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to frontend agents or stored in code. Only store in `~/.hermes/.env` or the agent's env.

---

## Tables and Indexes

### Already Exist (via SQLAlchemy models)

All tables are defined in `backend_common.py` — no new table definitions needed for Supabase migration.

```
documents
ingestion_jobs
ingestion_job_items
source_registry
users, accounts, sessions, verification_token
matter, matter_documents, matter_agent_runs
user_settings
```

### New / Modified for Supabase

#### 1. pgvector extension
```sql
CREATE EXTENSION IF NOT EXISTS vector;
-- Run once per Supabase project in SQL editor or via migration
```

#### 2. HNSW index on embeddings
```sql
-- Migration: 202604220001_create_hnsw_index.py
CREATE INDEX IF NOT EXISTS idx_documents_embedding_hnsw
ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

#### 3. Optional: tsvector index for BM25 (if not already present)
```sql
CREATE INDEX IF NOT EXISTS idx_documents_tsvector
ON documents
USING gin (to_tsvector('dutch', coalesce(title, '') || ' ' || coalesce(text, '')));
```
Note: The current code uses `to_tsvector` in queries directly. A GIN index on the tsvector column significantly speeds up BM25. Add if BM25 queries are slow on Supabase's shared pooler.

#### 4. Optional: source_registry index for faster ingestion dedup
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_source_registry_unique
ON source_registry (source_system, source_type, identifier)
WHERE is_active = true;
```

---

## Migration Steps (from current state to Supabase)

### Phase 1: Pre-Migration (Agents prepare, human approves)

1. Agent exports current `DATABASE_URL` as a backup reference
2. Agent runs a final eval to get baseline metrics:
   ```bash
   python evals/run_milestone2_eval.py --limit 10 --reports-dir /tmp/eval_before_supabase
   ```
3. Agent documents current document count:
   ```sql
   SELECT COUNT(*) FROM documents;
   SELECT COUNT(*) FROM documents WHERE embedding IS NOT NULL;
   ```

### Phase 2: Supabase Project Setup (Agent automates)

1. Human creates Supabase project at supabase.com (cannot be automated — requires login)
2. Agent captures the connection string from Supabase dashboard → Settings → Database
3. Agent writes connection string to `~/.hermes/.env` as `DATABASE_URL`
4. Agent runs the pgvector setup:
   ```bash
   # Via psql or a lightweight script
   psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"
   ```
5. Agent runs the HNSW migration:
   ```bash
   alembic upgrade head
   ```

### Phase 3: Data Migration (only if migrating FROM self-hosted Postgres)

If the current deployment is self-hosted Postgres and we're migrating to Supabase:

1. **Dump from source:**
   ```bash
   pg_dump $OLD_DATABASE_URL --format=plain --no-owner --no-acl > veridicta_dump.sql
   ```

2. **Load to Supabase:**
   ```bash
   psql $NEW_DATABASE_URL -f veridicta_dump.sql
   ```
   Note: Supabase has a 8GB import limit on free/pro tiers. For larger corpora, use `pg_dump` with `-Fc` (custom format) and `pg_restore`.

3. **Verify row counts match:**
   ```sql
   SELECT COUNT(*) FROM documents;  -- should match pre-migration count
   SELECT COUNT(*) FROM documents WHERE embedding IS NOT NULL;  -- should match
   ```

### Phase 4: Embedding Backfill (Agent runs)

```bash
python create_embeddings.py --limit 50000
```

Check progress via checkpoint:
```bash
cat .embedding_checkpoint.json
```

### Phase 5: Post-Migration Validation (Agent + Human)

1. Agent runs eval suite:
   ```bash
   python evals/run_milestone2_eval.py --limit 10 --reports-dir /tmp/eval_after_supabase
   ```
2. Agent compares: `ndcg@10`, `recall@10`, latency — must not regress by >5%
3. Agent runs a smoke test:
   ```bash
   curl http://localhost:8000/health  # or the deployed health endpoint
   curl "http://localhost:8000/search?q=ontslag+op+staande+voet&limit=5"
   ```
4. Human approves or rolls back

---

## How Agents Should Use This Skill

### The Skill Owns

- `DATABASE_URL` configuration for Supabase
- Running `alembic` migrations (table creation, index creation)
- Running `create_embeddings.py` with the right environment
- Validating the vector index is present and being used
- Reporting metrics before/after migration to the human

### The Skill Does NOT Own

- Creating the Supabase project (human step — requires login)
- Changing the SQLAlchemy models in `backend_common.py`
- Modifying the search logic in `search.py`
- Changing the embedding model (requires eval evidence first)
- Copying data between two live systems (human approves, then agent executes)

### Skill Execution Triggers

| Trigger | Action |
|---------|--------|
| New Supabase project created | Run pgvector extension + HNSW migration |
| New documents ingested (bulk) | Run `create_embeddings.py --limit N` |
| Eval reports recall regression | Check if embeddings are missing for new docs |
| Human requests migration | Execute Phase 1–5 in order |
| Supabase connection fails | Verify connection string, check Supabase status page |

---

## Supabase Skill File Structure

```
~/.hermes/skills/supabase-embedding/
├── SKILL.md                          # This document
└── references/
    ├── env_template.yaml             # Required env vars (no secrets)
    ├── supabase_setup_checklist.md   # Step-by-step human + agent actions
    └── sql/
        ├── 001_enable_vector.sql     # CREATE EXTENSION vector
        └── 002_create_hnsw_index.sql # CREATE INDEX ... USING hnsw
```

---

## Key Supabase Quirks for Agents to Know

1. **Connection string format** uses PgBouncer (connection pooler) by default. Format:
   `postgresql+psycopg://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   The port is `6543` (pooler), not `5432` (direct Postgres). Using the wrong port causes "connection refused."

2. **SSL is required** for Supabase connections. The `psycopg` driver enables SSL by default. Ensure `sslmode=require` is in the connection string if connecting via a custom driver.

3. **PgBouncer transaction-mode pooling** is the default for Supabase's connection pooler. This is incompatible with PostgreSQL features that require a persistent session (e.g., `SET LOCAL`, advisory locks, prepared statements across transactions). For Alembic migrations, use the **session mode** connection string (port `5432` direct, not the pooler). The skill should recommend:
   ```bash
   # For migrations: use direct connection (session mode)
   DATABASE_URL="postgresql+psycopg://postgres.[REF]:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
   # For app runtime: use pooler (transaction mode — better for web apps)
   DATABASE_URL="postgresql+psycopg://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
   ```

4. **Row Level Security (RLS)** is available in Supabase but is NOT currently configured in the Clarvo models. Supabase enables RLS on new tables by default. If the migration creates new tables, they may need `ALTER TABLE ... DISABLE ROW LEVEL SECURITY;` to avoid breaking the current app. (Currently not an issue since existing tables are not migrated.)

5. **Supabase free tier limits:** 500MB database, 2GB bandwidth, 50 concurrent connections via pooler. For MVP this is fine. At ~200k documents × 1536 floats × 4 bytes ≈ 1.2GB just for embeddings. May need to upgrade to paid tier as corpus grows.

---

## When to Use Supabase vs. Stay Self-Hosted

| Factor | Self-hosted Postgres | Supabase |
|--------|---------------------|----------|
| Team size | 1–2 | 1–5 |
| Dev/test environments | Good | Supabase is better — separate DB per branch via branching |
| Backup frequency | Manual or scripted | Automatic |
| Connection pooling | Manual (PgBouncer) | Built-in |
| Cost | Server cost (~$10–30/month) | Free to $25/month |
| Migration complexity | — | Low (connection string swap) |
| Best for | Full control, existing infra | Speed to production, minimal ops |
