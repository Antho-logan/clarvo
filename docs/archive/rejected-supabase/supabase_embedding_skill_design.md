# Supabase Embedding Skill — Design Document

**Date:** 2026-04-21
**Status:** DECLINED — See Section 10

---

## 1. What Problem This Skill Solves

The stated goal is to give agents a clean operational interface to Supabase as a vector/storage layer for the next phase of Veridicta.

The implied underlying problems are real:

- **Embedding lifecycle management** — currently `create_embeddings.py` is a one-shot batch script with no hooks for incremental updates, re-embedding on content change, or embedding invalidation.
- **Embedding observability** — no visibility into embedding coverage, staleness, or quality.
- **Multi-model embedding support** — the current stack is locked to `text-embedding-3-small` with no abstraction.
- **Agent-facing storage abstraction** — agents may need a simpler interface than raw SQLAlchemy + OpenAI calls.

These are legitimate needs. Supabase is not the answer to them.

---

## 2. Replace or Complement?

**Complement at most, and only if migration to Supabase-hosted Postgres happens anyway.**

The current architecture:

```
Veridicta App
  ├── PostgreSQL (self-hosted pgvector/pg17 in docker-compose)
  │     ├── documents table (with Vector(1536) embedding column)
  │     ├── HNSW index on embedding (idx_documents_embedding_hnsw)
  │     ├── GIN index for full-text (idx_documents_fulltext)
  │     └── All other tables (matters, ingestion_jobs, auth, etc.)
  ├── Supabase (Auth.js only — dashboard auth, not database)
  ├── Redis (docker-compose, currently unused/incomplete)
  └── Celery (celery_app.py, for async ingestion tasks)
```

Supabase provides:
- A hosted PostgreSQL compatible instance (with pgvector)
- Auth, Storage, Realtime, Edge Functions
- Admin UI and management tools

**Veridicta already runs its own PostgreSQL with pgvector.** Migrating to Supabase-hosted Postgres means moving the database off self-hosted infrastructure to a vendor. This is a significant decision with lock-in implications. It has nothing to do with embeddings specifically — it's a full database migration.

If the team wants Supabase, they should migrate the whole database intentionally, not bolt it on as an "embedding layer."

---

## 3. Schema, Tables, Indexes, Functions

Since the answer is "do not use Supabase for this," I'll document what the current Postgres setup already has — and what it would need if we actually addressed the embedding lifecycle problem properly within the existing stack.

### What Already Exists

```sql
-- documents table (already has embedding column)
ALTER TABLE documents ADD COLUMN embedding vector(1536);  -- done in migration 202604190002

-- HNSW index (already created)
CREATE INDEX idx_documents_embedding_hnsw ON documents
  USING hnsw (embedding vector_cosine_ops);
```

### What Would Be Needed for Proper Embedding Lifecycle

```sql
-- 1. Embedding job audit table
CREATE TABLE embedding_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL,          -- e.g. 'text-embedding-3-small'
    dimensions INTEGER NOT NULL,
    status TEXT NOT NULL,              -- 'running', 'completed', 'failed'
    total_documents INTEGER NOT NULL DEFAULT 0,
    processed_documents INTEGER NOT NULL DEFAULT 0,
    failed_documents INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    embedding_model_hash TEXT,         -- SHA of model+config to detect changes
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Per-document embedding metadata
CREATE TABLE document_embeddings (
    document_id UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    dimensions INTEGER NOT NULL,
    vector_bytes INTEGER NOT NULL,    -- for storage accounting
    content_hash TEXT NOT NULL,        -- SHA-256 of text at time of embedding (staleness detection)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Staleness detection function
CREATE OR REPLACE FUNCTION document_needs_reembedding(doc_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    content_hash TEXT;
    stored_hash TEXT;
BEGIN
    SELECT encode(sha256(text::bytea), 'hex')
    INTO content_hash
    FROM documents WHERE id = doc_id;

    SELECT content_hash INTO stored_hash
    FROM document_embeddings WHERE document_id = doc_id;

    RETURN stored_hash IS NULL OR stored_hash != content_hash;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Batch re-embedding function (SQL-level job marker)
CREATE OR REPLACE FUNCTION enqueue_stale_embeddings(batch_size INTEGER DEFAULT 500)
RETURNS TABLE(document_id UUID, content_hash TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT d.id, encode(sha256(d.text::bytea), 'hex')
    FROM documents d
    LEFT JOIN document_embeddings de ON de.document_id = d.id
    WHERE de.document_id IS NULL
       OR de.content_hash != encode(sha256(d.text::bytea), 'hex')
    ORDER BY d.updated_at ASC
    LIMIT batch_size;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Re-embedding trigger (auto-invalidate on text change)
CREATE OR REPLACE FUNCTION invalidate_embedding_on_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.text IS DISTINCT FROM NEW.text OR OLD.title IS DISTINCT FROM NEW.title THEN
        DELETE FROM document_embeddings WHERE document_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invalidate_embedding_on_change
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION invalidate_embedding_on_change();
```

### Supabase Does Not Add Any of This Natively

Supabase Vector is PostgreSQL + pgvector. The above schema changes are pure SQL that run on the current self-hosted Postgres. There is no Supabase-specific feature here — the added value would come from Supabase's management UI and hosted offering, not from any vector capability Postgres doesn't already have.

---

## 4. Environment Variables and Secrets

### Current (Already Required)

```bash
DATABASE_URL=postgresql+psycopg://antho@localhost:5432/veridicta_m1
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### For a Proper Embedding Lifecycle Skill (within existing Postgres)

```bash
# Embedding generation
OPENAI_API_KEY=sk-...                    # Already exists
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Already exists

# Optional: alternative embedding providers
COHERE_API_KEY=...                       # For multi-model support
GOOGLE_API_KEY=...                      # For text-embedding-004

# Embedding job tracking
EMBEDDING_CHECKPOINT_PATH=.embedding_checkpoint.json  # Already in create_embeddings.py
```

### For Supabase Migration (if decided)

```bash
# Replace current DATABASE_URL with Supabase connection string
DATABASE_URL=postgresql+psycopg://postgres.xxx.supabase.co:5432/postgres
# Or use Supabase connection pooler:
DATABASE_URL=postgresql+psycopg://postgres.xxx.supabase.co:6543/postgres

# Supabase service role key (server-side only — never client-side)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Remove self-hosted postgres references
# POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB — no longer apply
```

**Security note:** `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. It must only be used in server-side contexts, never exposed to the browser or agent tools.

---

## 5. Migrations

### If Staying on Self-Hosted Postgres (Recommended)

One new Alembic migration:

```python
"""add_embedding_lifecycle_tables

Revision ID: 202604210001
Revises: 202604210000  # assuming a next migration exists
"""

def upgrade() -> None:
    op.create_table("embedding_jobs", ...)
    op.create_table("document_embeddings", ...)
    op.create_index("idx_document_embeddings_document_id", ...)
    op.create_index("idx_embedding_jobs_status", ...)
    op.execute(CREATE_FUNCTION_document_needs_reembedding)
    op.execute(CREATE_FUNCTION_enqueue_stale_embeddings)
    op.execute(CREATE_TRIGGER_invalidate_embedding_on_change)
```

### If Migrating to Supabase

This is a full database migration, not a simple migration. Requires:

1. **Dump** existing self-hosted Postgres: `pg_dump -Fc veridicta_m1 > veridicta_dump.dump`
2. **Restore** to Supabase: `pg_restore -h db.xxx.supabase.co -U postgres -d postgres veridicta_dump.dump`
3. **DNS/connection string** updates across all services
4. **Row Level Security** policies must be re-applied (Supabase enables RLS by default; current schema has none)
5. **Connection pooling** — Supabase uses PgBouncer for connection pooling; connection string port changes from `5432` to `6543`
6. **SSL** must be enforced — Supabase requires `sslmode=require`
7. **Backup strategy** — verify Supabase point-in-time recovery is configured
8. **Admin credentials** — Supabase rotates some credentials; establish a secure secret management approach (Supabase Vault or external)

This is non-trivial. It should not be done as part of an "embedding skill" — it is a full infrastructure migration.

---

## 6. What the Agent Should Automate

If the decision is made to build proper embedding lifecycle management (regardless of whether Supabase is used), the agent should automate:

1. **Incremental embedding for new documents** — detect documents without embeddings on insert, generate them asynchronously via Celery task, update `document_embeddings` table.
2. **Staleness detection and re-embedding** — run `enqueue_stale_embeddings()` periodically, regenerate embeddings for changed documents.
3. **Embedding coverage reporting** — query `document_embeddings` joined with `documents` to report what % of documents have embeddings and how many are stale.
4. **Multi-model embedding storage** — store multiple embedding vectors per document (one per model) in a properly normalized `document_embeddings` table, with the `documents.embedding` column being a latest/preferred reference.
5. **Embedding quality signals** — flag documents where embedding generation failed, track failure reasons, surface failures in the dashboard.
6. **Model migration tooling** — when switching embedding models (e.g., from `text-embedding-3-small` to `text-embedding-3-large`), generate a new `embedding_jobs` record, process documents in batches, switch the active model atomically.

---

## 7. What the Agent Should Never Automate

1. **Never auto-delete embeddings** — embedding deletion is destructive and irreversible. Always require explicit confirmation.
2. **Never auto-switch the active embedding model** — changing the model's `embedding` column pointer mid-flight corrupts in-flight search results.
3. **Never drop the HNSW index** — re-indexing is expensive and blocks reads. Any index changes must be done with `CONCURRENTLY`.
4. **Never run embedding generation in the request path** — embedding is I/O-bound on the OpenAI API. It must be async (Celery worker). Never block the web request/response cycle.
5. **Never store the Supabase service role key in a place accessible to client-side code** — this is a permanent, irreversible secret.
6. **Never truncate `document_embeddings` without a full backup** — this is the audit trail for embedding operations.
7. **Never run `DROP EXTENSION vector`** — this destroys all vector data and is unrecoverable without a backup.

---

## 8. Embedding Lifecycle: Generate, Store, Query, Update

### Generate

- **Current:** `create_embeddings.py` — batch script, OpenAI API, page size 500, checkpointing, retries with exponential backoff.
- **Improved:** Celery task `tasks.py` wrapping the same logic, triggered on document insert via `after_insert` hook in SQLAlchemy or explicit enqueue in the ingestion pipeline.
- **Multi-model:** Accept `model` parameter, store in `document_embeddings` with `model_name` column.

### Store

- **Current:** `documents.embedding` column (inline `Vector(1536)`).
- **Improved:** Separate `document_embeddings` table with foreign key to `documents`, allowing multiple embedding vectors per document. `documents.embedding` becomes a computed/last-write-wins reference column.

```python
# Store a new embedding
embedding = validate_embedding_dimensions(embedding_response.data[0].embedding)
doc_embedding = DocumentEmbedding(
    document_id=document.id,
    model_name=model_name,
    dimensions=len(embedding),
    vector_bytes=len(embedding) * 4,  # float32
    content_hash=hashlib.sha256(document.text.encode()).hexdigest(),
    embedding_vector=embedding,  # stored in document_embeddings.embedding
)
# Update the reference column
document.embedding = embedding
```

### Query

- **Current:** `vector_search()` in `search.py` — cosine distance `<=>` operator with HNSW index, direct SQL.
- **No change needed** — the query path is already working. Adding a `model_name` filter would allow querying specific embedding models if multi-model support is added.

### Update (Re-embedding)

```python
def reembed_if_stale(document_id: UUID) -> bool:
    """Return True if re-embedding was triggered."""
    session = get_session_factory()()
    with session:
        doc = session.query(Document).get(document_id)
        if not document_needs_reembedding(doc.id):
            return False

        # Mark old embedding as superseded (soft delete via updated_at)
        session.execute(
            text("UPDATE document_embeddings SET updated_at = NOW() WHERE document_id = :id"),
            {"id": str(document_id)}
        )

        # Generate new embedding
        embedding = generate_embedding(doc.text)

        # Store new embedding
        new_de = DocumentEmbedding(
            document_id=doc.id,
            model_name=current_model(),
            content_hash=compute_hash(doc.text),
            embedding=embedding,
        )
        session.add(new_de)
        doc.embedding = embedding
        session.commit()
        return True
```

---

## 9. Retrieval Latency, Ops Complexity, Maintainability

### Latency

| Path | Current | With Supabase (hosted) | With Self-Hosted Improvements |
|------|---------|----------------------|---------------------------|
| BM25 (full-text) | ~10-50ms (local Postgres) | ~20-100ms (Supabase hosted) | ~10-50ms (no change) |
| Vector search | ~20-80ms (HNSW, local) | ~50-200ms (Supabase hosted, depends on region) | ~20-80ms (no change) |
| Hybrid (both) | ~40-130ms | ~70-300ms | ~40-130ms |
| Embedding generation | ~100-500ms/doc (OpenAI API) | Same (API call is the bottleneck) | Same |

**Verdict:** Supabase hosted Postgres will be slower for vector search due to network latency to Supabase's cloud. If Veridicta's Postgres is on the same machine or same LAN, the current setup is faster.

### Ops Complexity

| Concern | Current | With Supabase | With Self-Hosted Improvements |
|---------|---------|---------------|---------------------------|
| Database management | Self-hosted (you own it) | Managed by Supabase | Self-hosted (no change) |
| Embedding lifecycle | None (batch script) | Supabase adds a UI layer | New Celery tasks + schema |
| Connection management | Direct connection | PgBouncer pooling (auto) | No change |
| RLS policies | None | Must be configured | No change |
| Backup | Manual or external script | Supabase PITR (automatic) | Manual or external |
| Secrets | .env.local | Supabase Vault or .env | No change |
| Monitoring | Your own logs/metrics | Supabase dashboard | Your own |

**Supabase adds a UI and reduces some DBA burden, but adds vendor management.** For a product at Veridicta's stage, this is not clearly better — it's trading one kind of complexity for another.

### Maintainability

- **Current:** Low complexity. One PostgreSQL instance. The `create_embeddings.py` script is simple and well-understood.
- **Supabase:** Adds vendor lock-in surface. If Supabase changes pricing, deprecates features, or has an outage, Veridicta is affected. The embedding code itself doesn't get simpler — it just runs against a different host.
- **Self-hosted improvements:** Adds schema complexity and Celery task complexity, but keeps the stack coherent and avoids vendor lock-in.

---

## 10. Verdict: Do This Now or Later?

**Do not do this now. Do not do this with Supabase.**

###理由 (Reasoning)

1. **Supabase does not solve any current problem.** Veridicta already has pgvector with HNSW indexing. The only thing Supabase adds is hosted infrastructure and a UI — at the cost of vendor lock-in and added latency.

2. **The real need is embedding lifecycle management, not a new database.** The actual gap is that `create_embeddings.py` is a batch script, not a lifecycle system. Build that within the existing Postgres stack.

3. **Supabase is not free at scale.** The free tier has limits (500MB database, 1GB transfer/month for Edge Functions, etc.). Veridicta's document corpus will grow. Supabase Pro is $25/month for 8GB database. At scale, self-hosted Postgres on a $10-20/month VPS is cheaper and more flexible.

4. **Migrating the database is a separate decision.** If the team wants Supabase, it should be a deliberate infrastructure decision with a full migration plan — not packaged as an "embedding skill."

5. **Premature optimization on the storage layer.** The current Postgres + pgvector setup is solid. The bottleneck is not the vector storage — it's the OpenAI API for embedding generation, which Supabase does not change.

### Recommended Next Steps

**Instead of a Supabase embedding skill, build these in priority order:**

1. **Embedding lifecycle schema** — the `embedding_jobs` and `document_embeddings` tables + staleness detection function (Section 3 above). One Alembic migration.

2. **Celery-powered incremental embedding** — replace the batch script with Celery tasks, triggered on document insert/update in the ingestion pipeline.

3. **Embedding coverage dashboard** — simple query joining `documents` and `document_embeddings` to show % coverage and stale count.

4. **Multi-model abstraction** — if switching embedding models is a roadmap item, abstract the embedding generation behind a `EmbeddingService` class with provider pluggability (OpenAI, Cohere, Google). Do this before considering any vendor change.

5. **Re-evaluate Supabase** if/when Veridicta needs hosted auth, hosted storage (for document uploads), or Realtime features — not for vector storage.

---

*This document represents the research and systems-design view. The decision ultimately rests with the project lead.*
