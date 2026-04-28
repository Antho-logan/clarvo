# Changelog

## Upgrade to 10/10 - in progress

- Recorded a baseline inventory and command results.
- Added local quality gates for Python and frontend checks.
- Moved schema management to Alembic.
- Added pgvector `vector(1536)` embeddings with HNSW indexing.
- Replaced Python-side vector scans with SQL-side pgvector search.
- Added Celery/Redis enqueue-only ingestion endpoints.
- Added retry/backoff for BWB and Rechtspraak fetches.
- Added embedding retry/checkpoint support.
- Added retrieval metrics and JSON/Markdown eval reports.
- Replaced mocked agent knowledge lookup with typed source-backed tools.
- Expanded the FastAPI legal API surface.
- Wired dashboard home and workflows to live backend endpoints.
- Extracted shared XML parser helpers.
