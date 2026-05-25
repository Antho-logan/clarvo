# Embedding Lifecycle Runbook

## Scope

This runbook covers the current Postgres + pgvector embedding lifecycle. It does not cover Supabase, EU law ingestion, corpus expansion strategy, or ranking redesign.

## Lifecycle State Model

Document embeddings are tracked directly on `documents`:

- `embedding_status`: `pending`, `completed`, `failed`, `stale`, or `skipped`
- `embedding_model`: model that produced the stored vector
- `embedding_dimensions`: expected pgvector width, currently `1536`
- `embedding_version`: application embedding schema version, default `v1`
- `embedded_at`: completion timestamp
- `embedding_source_hash`: SHA-256 hash of normalized document text
- `embedding_attempts`: number of attempted embedding writes
- `embedding_error`: latest failure or skip reason
- `last_embedding_job_id`: operational job id from `ingestion_jobs`

`skipped` is used only for blank text rows so coverage reports do not keep reporting them as missing work.

## Missing And Stale Detection

Run a lifecycle refresh before coverage checks or backfills:

```bash
python3 scripts/embedding_coverage_report.py --refresh
```

The refresh marks rows as:

- `pending` when no embedding exists and text is non-empty
- `skipped` when normalized text is blank
- `stale` when stored model, version, dimensions, or source hash no longer matches current configuration/content
- `failed` when a previous embedding attempt failed and has not been explicitly retried
- `completed` when vector metadata and source hash match

The source hash is deterministic: SHA-256 over normalized document text.

## Inspect Coverage

```bash
python3 scripts/embedding_coverage_report.py --refresh
```

The report groups by:

- source type
- source system
- domain
- embedding status
- model/version/dimensions

API equivalent:

```bash
curl "http://127.0.0.1:8000/embeddings/coverage?refresh=true" \
  -H "Authorization: Bearer $CLARVO_API_TOKEN"
```

## Backfill Missing Embeddings

Local script path:

```bash
OPENAI_API_KEY=sk-... python3 create_embeddings.py \
  --mode missing \
  --limit 500 \
  --page-size 100
```

Background job path:

```bash
curl -X POST http://127.0.0.1:8000/embeddings/backfill \
  -H "Authorization: Bearer $CLARVO_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"missing","limit":500,"page_size":100}'
```

Then inspect:

```bash
curl http://127.0.0.1:8000/ingestion/jobs/$JOB_ID \
  -H "Authorization: Bearer $CLARVO_API_TOKEN"
```

## Re-Embed Stale Rows

Use this after document text changes, embedding model changes, or `EMBEDDING_SCHEMA_VERSION` changes:

```bash
OPENAI_API_KEY=sk-... python3 create_embeddings.py \
  --mode stale \
  --limit 500 \
  --page-size 100
```

Background job:

```bash
curl -X POST http://127.0.0.1:8000/embeddings/reembed-stale \
  -H "Authorization: Bearer $CLARVO_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit":500,"page_size":100}'
```

## Retry Failed Rows

Failed rows are not retried implicitly. Retry them explicitly:

```bash
OPENAI_API_KEY=sk-... python3 create_embeddings.py \
  --mode failed \
  --retry-failed \
  --limit 100 \
  --page-size 50
```

or:

```bash
curl -X POST http://127.0.0.1:8000/embeddings/backfill \
  -H "Authorization: Bearer $CLARVO_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"failed","retry_failed":true,"limit":100,"page_size":50}'
```

## Failure Handling

Each embedding attempt increments `embedding_attempts` and records `last_embedding_job_id`.

Successful rows are marked `completed` and store model/version/dimensions/source hash.

Failed rows are marked `failed`, retain source text, retain any previous vector, and store the latest `embedding_error`. Vector search only uses rows with `embedding_status='completed'` and matching model/version/dimensions.

## Search Safety

Hybrid search degrades to BM25 when `OPENAI_API_KEY` is not configured. Vector search filters out missing, stale, skipped, failed, wrong-model, wrong-version, and wrong-dimension embeddings.

## Intentionally Deferred

- Supabase or managed vector-store migration
- embedding quality evaluation beyond the existing eval harness
- corpus expansion execution
- ranking redesign
- assistant behavior changes
- EU law ingestion
