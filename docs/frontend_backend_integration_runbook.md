# Frontend + Backend Integration Runbook

## Purpose

This runbook covers the live dashboard integration between the Next.js frontend and the FastAPI backend.

The wired dashboard pages are:

- `/dashboard/knowledge`
- `/dashboard/documents`
- `/dashboard/agents`
- `/dashboard/documents/[sourceId]`

## Required Environment

Backend:

- `DATABASE_URL`

Frontend:

- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`

Optional backend environment variables still apply as documented in the milestone runbooks:

- `OPENAI_API_KEY` if you are also testing embeddings or agent tooling
- `OPENAI_EMBEDDING_MODEL`
- `OPENAI_CHAT_MODEL`

## Backend Setup

```bash
cd /Users/antho/Desktop/veridicta/veridicta
python3 -m pip install --user -r requirements-backend.txt
export DATABASE_URL='postgresql+psycopg://localhost:55432/veridicta_m1'
python3 init_db.py
python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

If your database is already populated, reuse the same `DATABASE_URL` and skip re-ingestion.

## Frontend Setup

```bash
cd /Users/antho/Desktop/veridicta/veridicta
printf 'NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000\n' > .env.local
npm install
npm run dev
```

The frontend defaults to `http://127.0.0.1:8000` when the env var is omitted, but setting `.env.local` is recommended so the target is explicit.

## What To Test

### Knowledge

Open:

- `http://localhost:3000/dashboard/knowledge`

Try searches:

- `huurcontract`
- `ontslag`
- `bezwaar`
- `ECLI`

Check that:

- search results are real backend hits
- source type and domain filters change the result set
- each result links to a source detail page
- the recent ingestion jobs panel loads

### Vault

Open:

- `http://localhost:3000/dashboard/documents`

Check that:

- documents load from `/documents`
- filters for domain and source type work
- each card links to `/dashboard/documents/[sourceId]`
- recent ingestion jobs appear in the sidebar

### Source Detail

Open any source from Knowledge or Vault.

Check that:

- metadata renders correctly
- multiple stored rows for one source are shown
- legislation rows display article and section content
- case law rows show case metadata when present

### Assistant

Open:

- `http://localhost:3000/dashboard/agents`

Try:

- `huurcontract servicekosten`
- `ontslag op staande voet`
- `bezwaar termijn Awb`

Check that:

- the page renders grounded retrieval results only
- no fake generated legal answer is shown
- result cards link to real source detail pages

## Known Limitations

- The assistant is retrieval-first only. It does not yet call the heavier orchestration or answer-generation flows.
- The dashboard still has no auth, upload workflow, or background ingestion controls.
- The detail page is a useful first reader, not a full document viewer.
- The frontend relies on the backend already containing ingested legal data.
- The landing page and matter/workflow experiences remain mostly unchanged in this milestone.

## Troubleshooting

If all live pages show backend errors:

1. Verify the backend is running on `127.0.0.1:8000`.
2. Confirm `DATABASE_URL` points at the database that already contains ingested data.
3. Run `curl http://127.0.0.1:8000/health`.
4. Run `curl 'http://127.0.0.1:8000/documents?limit=5'`.
5. Run `curl 'http://127.0.0.1:8000/search?q=huurcontract&limit=5'`.

If the backend is healthy but returns empty arrays, the UI is working and the issue is likely that the connected database has not been populated yet.
