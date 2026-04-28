# Embedding Backfill — Phase 4

**Date:** 2026-04-27
**Status:** BLOCKED

## What Was Attempted

1. Ran `scripts/embedding_coverage_report.py --refresh` → confirmed 9,649 documents, 0 embeddings
2. Attempted to run `python create_embeddings.py` → would fail on every batch
3. Tested OpenAI API directly: `text-embedding-3-small` returns **403 Forbidden**

## Error Details

```
openai.PermissionDeniedError: Error code: 403
{
  "error": {
    "message": "Project `proj_c9lk8wQO4SkvDNiJ3acV6xNr` does not have access to model `text-embedding-3-small`",
    "type": "invalid_request_error"
  }
}
```

## Available Models

| Model | Access |
|-------|--------|
| gpt-4o-mini | ✅ Works |
| gpt-4.1-mini | ❌ 404 |
| text-embedding-3-small | ❌ 403 |
| text-embedding-3-large | ❌ 403 |

## Resolution Required

**Option A:** Enable embedding models on the current OpenAI project (recommended)
  - Go to OpenAI Platform → Project Settings → Models → enable `text-embedding-3-small`
  
**Option B:** Use a different OpenAI API key/project with embedding access
  - Replace `OPENAI_API_KEY` in `.env`

**Option C:** Use an alternative embedding provider
  - Modify `OPENAI_EMBEDDING_MODEL` and `search.py` to use a free/open-source embedding endpoint

## Impact

Without embeddings:
- Vector search is non-functional (crashes with 403)
- Hybrid search is non-functional
- The `/agent/chat` endpoint crashes on every request
- Only BM25 text search works (and returned 0 hits for Dutch legal queries — likely a tokenization issue)

## Backfill Plan (once unblocked)

```bash
cd /mnt/c/Desktop/veridicta
source .venv/bin/activate
export $(grep -v '^#' .env | xargs)
python create_embeddings.py --batch-size 100 --concurrency 5
```

Estimated: 9,649 docs × ~1 token/ms = ~10 minutes with concurrency 5.
