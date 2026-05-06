# Embedding / Storage Strategy — Veridicta

**Question:** Stay on current Postgres/pgvector path, extend to Supabase + pgvector, or hybrid?

---

## Current Architecture

The codebase shows:

```
PostgreSQL (vanilla, self-hosted or cloud)
  └── pgvector extension enabled (migration: 202604190002_enable_pgvector.py)
  └── documents table
        ├── embedding: Vector(1536) — text-embedding-3-small (OpenAI)
        ├── tsvector (Dutch) — BM25 via websearch_to_tsquery
        └── hybrid_search() — Python-side score fusion (normalize + sum)
```

- **Embedding model:** `text-embedding-3-small` (OpenAI), 1536 dimensions, configurable via `OPENAI_EMBEDDING_MODEL`
- **Ingestion:** `create_embeddings.py` — batch script, processes documents without embeddings
- **Search:** `search.py` — `hybrid_search()` does BM25 + vector in separate queries, Python-side merge
- **No separate vector index service** — everything in one Postgres instance
- **DB URL:** from `DATABASE_URL` env var, SQLAlchemy with `postgresql+psycopg://` driver

### What Supabase Would Add

Supabase is:
1. A **hosted Postgres** service (managed PostgreSQL with automatic backups, HA)
2. A **pgvector wrapper** with managed HNSW/IVFFlat indexes
3. An **API layer** (REST + Realtime + Auth)
4. A **dashboard** for monitoring
5. **Connection pooling** via PgBouncer built in

Supabase does NOT add a separate vector database. It is still Postgres + pgvector.

---

## Decision Framework

### Option A: Stay on Current Postgres/pgvector

**What this means:** Keep current self-hosted or cloud PostgreSQL + pgvector. No changes to codebase.

| Factor | Assessment |
|--------|-----------|
| Implementation effort | Zero — already working |
| Ops simplicity | Depends on where Postgres runs. Self-hosted = you manage backups, upgrades, HA. Cloud Postgres (e.g., Railway, Render, Supabase Postgres, Neon) = managed. |
| Search/index quality | pgvector HNSW is the gold standard for cosine similarity on small-to-medium corpora. IVFFlat is fine for <1M vectors. Current setup uses exact `<=>` operator — no HNSW/IVFFlat index built yet. |
| Scalability | Single Postgres works fine to ~5M chunks. Beyond that, partitioned vectors or a dedicated vector store (Pinecone, Qdrant, Weaviate) becomes worth considering. |
| Cost | ~$15–50/month for a managed Postgres instance (Neon, Supabase, Railway). |
| Agent usability | Agents need `DATABASE_URL`. Everything works as-is. |

**Critical gap identified:** There is NO index built on the `embedding` column. The current `vector_search()` does `ORDER BY embedding <=> :vector` which is a brute-force scan over all rows with embeddings. For anything beyond a few thousand chunks, this will degrade. **This is the single most important thing to fix regardless of which option is chosen.**

### Option B: Supabase + pgvector

**What this means:** Migrate to Supabase hosted Postgres, use Supabase's managed pgvector with built-in HNSW index creation.

| Factor | Assessment |
|--------|-----------|
| Implementation effort | Low. Change `DATABASE_URL` to Supabase connection string. Run `CREATE EXTENSION IF NOT EXISTS vector;` and `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops);` via a migration. SQLAlchemy/pgvector in Python works identically — Supabase is just a managed Postgres. |
| Ops simplicity | High — Supabase handles backups, failover, connection pooling (built-in PgBouncer). No server maintenance. |
| Search/index quality | Supabase pgvector supports HNSW and IVFFlat. They provide a `match_embeddings` SQL function in their pgvector extension. The `embedding` column needs an HNSW index for production use. |
| Scalability | Supabase free tier: 500MB database, 2GB transfer. Paid tiers: up to 8TB storage. HNSW index scales to ~10M vectors on a single node comfortably. |
| Cost | Free tier available. Paid: ~$25/month for Pro plan (sufficient for MVP-to-early-growth). |
| Agent usability | `DATABASE_URL` = Supabase connection string. `SUPABASE_URL` and `SUPABASE_ANON_KEY` for the REST API (not needed for pure vector ops). |
| Connection pooling | Built-in via Supabase's PgBouncer. No extra config needed. |
| Migration risk | Low. SQLAlchemy models don't change. The only breaking change is the connection string format: `postgresql+psycopg://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` |

### Option C: Hybrid — Postgres + Dedicated Vector DB

**What this means:** Keep Postgres for documents/metadata, add Qdrant/Pinecone for vectors.

| Factor | Assessment |
|--------|-----------|
| Implementation effort | High — dual-write ingestion pipeline, sync complexity, two connection systems |
| Ops simplicity | Low — two services to monitor, two failure modes |
| Scalability | Very high — dedicated vector DB handles millions of vectors |
| When to consider | Only when Postgres vector search latency exceeds requirements at >5M chunks |

**Verdict for Veridicta at this stage:** NOT YET. This is a post-MVP concern, likely at 1M+ chunks. Defer.

---

## Blunt Recommendation

### What to do NOW

**Fix the missing vector index first, regardless of hosting choice.**

Add this migration immediately — it is the single highest-leverage change for search quality:

```sql
-- In a new migration file
CREATE INDEX IF NOT EXISTS idx_documents_embedding_hnsw
ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

Then update `create_embeddings.py` or add a separate `create_vector_index.py` script that agents can run after bulk ingestion.

### Hosting decision: Supabase is the right move

**Reasons:**
1. Zero operational overhead for backups, failover, connection pooling
2. The codebase is SQLAlchemy — no vendor lock-in, no ORM changes needed
3. Supabase's free tier is sufficient for MVP demos and early users
4. When Veridicta outgrows Supabase, migrate to a dedicated Postgres (Neon, Railway) by changing the connection string
5. Supabase adds auth helpers (RLS — Row Level Security) that could be useful for multi-tenant matter scoping later

**Migration path from current state:**
1. Create Supabase project
2. Enable pgvector extension in Supabase dashboard (or via SQL: `CREATE EXTENSION vector;`)
3. Run the HNSW index migration
4. Change `DATABASE_URL` in environment to Supabase connection string
5. `python create_embeddings.py --limit 10000` to backfill embeddings for any unembedded documents
6. Verify `hybrid_search()` works identically

**The ONLY code change needed** is the `DATABASE_URL` environment variable. The SQLAlchemy model, the search module, and the embedding script all work with Supabase's Postgres without modification.

### What to Defer

- Moving to a dedicated vector database (Qdrant, Pinecone, Weaviate) — only when corpus exceeds ~2M chunks
- Hybrid SQL + vector architectures — overengineered at this stage
- Changing embedding models — text-embedding-3-small is the correct cost/quality trade-off for Dutch legal text

---

## Specific Technical Steps (for Agents)

### Step 1: Index Creation (Critical — Do First)

Create `migrations/versions/202604220001_create_hnsw_index.py`:

```python
"""Create HNSW index on embedding column for production vector search."""

from alembic import op

def upgrade() -> None:
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_documents_embedding_hnsw
        ON documents
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    """)

def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_documents_embedding_hnsw;")
```

The `m` and `ef_construction` parameters:
- `m = 16` — number of bi-directional links per node. Higher = better recall, slower build. 16 is a good default for corpora <10M.
- `ef_construction = 64` — search width during build. Higher = better recall, slower build. 64 is standard.

### Step 2: Supabase Migration (After Index)

1. Sign up at supabase.com, create project
2. Get connection string: Settings → Connection Pooling → Python (psycopg2/psycopg3)
3. Format: `postgresql+psycopg://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
4. Set env: `DATABASE_URL=[CONNECTION_STRING]`
5. In Supabase SQL editor, run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
-- The index from Step 1 will be created by the migration system
```

### Step 3: Embedding Backfill (After Supabase Setup)

```bash
python create_embeddings.py --limit 50000
```

### Step 4: Verify Search Quality

Run the eval suite:
```bash
python evals/run_milestone2_eval.py --limit 10
```

Compare `ndcg@10`, `precision@10`, `recall@10` against the pre-index baseline. Log the improvement.

---

## Storage / Index Summary Table

| Concern | Current State | After Fix | Supabase |
|---------|--------------|-----------|----------|
| Vector index | None (brute force) | HNSW | HNSW |
| Embedding model | text-embedding-3-small | Same | Same |
| Dimensions | 1536 | Same | Same |
| Connection pooling | Depends on setup | Same | Built-in PgBouncer |
| Backup/HA | Depends on setup | Same | Automatic |
| Code changes | — | 1 migration file | `DATABASE_URL` only |
| Monthly cost | ~$0–30 | ~$0–30 | ~$0–25 (free tier) |

---

## Final Answer

**Stay on the Postgres/pgvector path. Migrate to Supabase for managed ops. Build the HNSW index immediately. Do NOT add a separate vector DB yet.**
