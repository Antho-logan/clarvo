# Supabase Embedding Skill — Runbook

**DISCLAIMER:** This runbook documents how to implement embedding lifecycle management within the **existing self-hosted Postgres** stack. Supabase is not recommended as the vector layer (see `supabase_embedding_skill_risks.md`). These procedures apply to `~/veridicta/.claude/worktrees/gallant-payne-a230e0/`.

---

## Runbook: Embedding Lifecycle Management

### Prerequisites

```bash
cd ~/veridicta/.claude/worktrees/gallant-payne-a230e0
source venv/bin/activate  # or your Python env
export DATABASE_URL=postgresql+psycopg://antho@localhost:5432/veridicta_m1
export OPENAI_API_KEY=sk-...
```

---

## 1. Apply the Embedding Lifecycle Schema

```bash
# 1. Generate the Alembic migration
alembic revision --autogenerate -m "add_embedding_lifecycle_tables"

# 2. Review the generated migration file before applying
# Located at: migrations/versions/YYYYMMDDNNN_add_embedding_lifecycle_tables.py

# 3. Apply the migration
alembic upgrade head

# 4. Verify tables exist
psql $DATABASE_URL -c "\dt embedding_jobs document_embeddings"
psql $DATABASE_URL -c "\df document_needs_reembedding enqueue_stale_embeddings"
```

---

## 2. Seed the Embedding Jobs Table (Existing Embeddings)

If you have existing documents with embeddings in `documents.embedding`, backfill the `document_embeddings` table:

```bash
python - <<'EOF'
import hashlib
from backend_common import get_session_factory, Document
from sqlalchemy import text

session_factory = get_session_factory()
with session_factory() as session:
    docs_with_embeddings = session.query(Document).filter(
        Document.embedding.isnot(None)
    ).all()

    for doc in docs_with_embeddings:
        content_hash = hashlib.sha256(doc.text.encode()).hexdigest()
        session.execute(
            text("""
                INSERT INTO document_embeddings
                (document_id, model_name, dimensions, vector_bytes, content_hash, embedding)
                VALUES (:doc_id, :model, :dims, :bytes, :hash, :vec)
                ON CONFLICT (document_id) DO NOTHING
            """),
            {
                "doc_id": str(doc.id),
                "model": "text-embedding-3-small",
                "dims": 1536,
                "bytes": 1536 * 4,
                "hash": content_hash,
                "vec": doc.embedding,
            }
        )
    session.commit()
    print(f"Backfilled {len(docs_with_embeddings)} document embeddings")
EOF
```

---

## 3. Embedding Coverage Report

```bash
python - <<'EOF'
from backend_common import get_session_factory, Document
from sqlalchemy import func, text

session_factory = get_session_factory()
with session_factory() as session:
    total = session.query(func.count(Document.id)).scalar()
    embedded = session.execute(
        text("SELECT COUNT(*) FROM document_embeddings")
    ).scalar()
    stale = session.execute(
        text("""
            SELECT COUNT(*) FROM document_embeddings de
            JOIN documents d ON d.id = de.document_id
            WHERE de.content_hash != encode(sha256(d.text::bytea), 'hex')
        """)
    ).scalar()

    print(f"Total documents:  {total}")
    print(f"Have embedding:   {embedded}")
    print(f"Missing:          {total - embedded}")
    print(f"Stale (changed):  {stale}")
    print(f"Coverage:         {embedded/total*100:.1f}%" if total else "N/A")
EOF
```

---

## 4. Run Incremental Embedding (New Documents Only)

```bash
python create_embeddings.py --limit 500 --page-size 100
```

To enable incremental mode (skip already-embedded documents), the existing `create_embeddings.py` already queries `WHERE embedding IS NULL`. It is effectively incremental.

For a Celery-based approach, add this to `ingestion/tasks.py`:

```python
from celery_app import celery
from backend_common import get_session_factory, Document
from create_embeddings import create_embeddings

@celery.task
def embed_new_documents(limit: int = 200):
    """Celery task: embed documents that are missing embeddings."""
    create_embeddings(limit=limit, page_size=100)
    return {"embedded": limit}

# Trigger from ingestion pipeline after document insert:
# embed_new_documents.delay(limit=100)
```

---

## 5. Re-embed Stale Documents

Documents where the text changed after embedding was created.

```bash
python - <<'EOF'
from backend_common import get_session_factory, Document
from sqlalchemy import text
import hashlib

session_factory = get_session_factory()
with session_factory() as session:
    stale = session.execute(
        text("""
            SELECT d.id, d.text, de.content_hash
            FROM documents d
            JOIN document_embeddings de ON de.document_id = d.id
            WHERE de.content_hash != encode(sha256(d.text::bytea), 'hex')
            LIMIT 100
        """)
    ).fetchall()

    print(f"Found {len(stale)} stale documents")
    for row in stale:
        doc_id, text, stored_hash = row
        current_hash = hashlib.sha256(text.encode()).hexdigest()
        print(f"  Document {doc_id}: stored={stored_hash[:16]}... current={current_hash[:16]}...")

    if stale:
        confirm = input(f"Re-embed {len(stale)} documents? [y/N] ")
        if confirm.lower() == 'y':
            for row in stale:
                doc_id = row[0]
                # Mark old embedding as superseded
                session.execute(
                    text("UPDATE document_embeddings SET updated_at = NOW() WHERE document_id = :id"),
                    {"id": str(doc_id)}
                )
                # Re-embed via existing batch script (in practice, enqueue a Celery task)
                session.execute(
                    text("DELETE FROM document_embeddings WHERE document_id = :id"),
                    {"id": str(doc_id)}
                )
            session.commit()
            print("Marked stale. Run: python create_embeddings.py --limit 100")
EOF
```

---

## 6. Multi-Model Embedding (Future)

When adding a second embedding model (e.g., Cohere):

```sql
-- Add second embedding
INSERT INTO document_embeddings
  (document_id, model_name, dimensions, vector_bytes, content_hash, embedding)
VALUES
  (:doc_id, 'cohere-embed-multilingual-v3.0', 1024, 4096, :hash, :vec)
ON CONFLICT (document_id, model_name) DO UPDATE SET
  embedding = EXCLUDED.embedding,
  content_hash = EXCLUDED.content_hash,
  updated_at = NOW();
```

To switch the active model:

```sql
BEGIN;
-- Mark all current embeddings as superseded
UPDATE document_embeddings SET updated_at = NOW()
WHERE model_name = 'text-embedding-3-small';

-- Insert new model embeddings (via batch script with --model cohere-embed-multilingual-v3.0)

-- Switch reference column (atomic)
UPDATE documents SET embedding = (
    SELECT embedding FROM document_embeddings
    WHERE document_id = documents.id
      AND model_name = 'cohere-embed-multilingual-v3.0'
    LIMIT 1
);

-- Delete old model embeddings
DELETE FROM document_embeddings WHERE model_name = 'text-embedding-3-small';
COMMIT;
```

**Never do this mid-flight.** Ensure no search requests are in progress before switching the reference column.

---

## 7. Supabase Migration (If Ultimately Decided)

Only follow this path if the team explicitly decides to migrate the database to Supabase. This is **not recommended** — see `supabase_embedding_skill_risks.md`.

### Pre-Migration Checklist

```bash
# 1. Create a full binary backup
pg_dump -Fc -b -v veridicta_m1 > /tmp/veridicta_pre_supabase_$(date +%Y%m%d).dump

# 2. Verify backup integrity
pg_restore --list /tmp/veridicta_pre_supabase_*.dump | head -20

# 3. Export connection details from Supabase dashboard:
#    Project Settings > Database > Connection string (Python / psycopg2)
SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"

# 4. Test connection
psql "$SUPABASE_DB_URL?sslmode=require" -c "SELECT version();"
```

### Migration

```bash
# 1. Restore to Supabase (takes time depending on data size)
pg_restore -h db.[REF].supabase.co -U postgres \
  -d postgres \
  --no-owner \
  --role=postgres \
  --sslmode=require \
  /tmp/veridicta_pre_supabase_*.dump

# 2. Verify document count
psql "$SUPABASE_DB_URL?sslmode=require" -c "SELECT COUNT(*) FROM documents;"

# 3. Update DATABASE_URL in .env.local
# DATABASE_URL=postgresql+psycopg://postgres:[PASSWORD]@db.[REF].supabase.co:6543/postgres
# (Use port 6543 for PgBouncer connection pooler)

# 4. Update docker-compose.yml to remove local postgres service
# (Or keep it for local dev only, point DATABASE_URL to Supabase for staging/prod)

# 5. Configure Row Level Security (Supabase enables RLS by default)
#    Current schema has no RLS policies — either:
#    a) Disable RLS: ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
#    b) Add RLS policies: see Supabase docs for user-based RLS

# 6. Verify pgvector extension
psql "$SUPABASE_DB_URL?sslmode=require" -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# 7. Verify HNSW index
psql "$SUPABASE_DB_URL?sslmode=require" -c "\di idx_documents_embedding_hnsw"
```

### Post-Migration Verification

```bash
# Quick smoke test — search should still work
python -c "
from search import hybrid_search, bm25_search
hits = bm25_search('opzegtermijn huur', limit=3)
print(f'BM25 hits: {len(hits)}')
"

# Vector search
python -c "
from search import vector_search
hits = vector_search('opzegtermijn huur', limit=3)
print(f'Vector hits: {len(hits)}')
"
```

---

## 8. Rollback (If Supabase Migration Fails)

```bash
# 1. Stop all app connections to Supabase
# 2. Restore from local backup
pg_restore -h localhost -U veridicta \
  -d veridicta_m1 \
  --clean \
  /tmp/veridicta_pre_supabase_*.dump

# 3. Restore DATABASE_URL to local
# DATABASE_URL=postgresql+psycopg://antho@localhost:5432/veridicta_m1

# 4. Verify
python -c "from backend_common import get_session_factory; print('OK')"
```
