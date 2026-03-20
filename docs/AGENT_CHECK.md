# Veridicta QA Validation Files

## Created by: Henkie (OpenClaw)
## Date: 2026-03-17

## Quick Access

All validation and handoff files are in the `docs/` directory:

| File | Purpose |
|------|---------|
| `docs/live_validation_report.md` | Stack status, page findings, blockers |
| `docs/live_issues_todo.md` | Issues list with severity & fixes |
| `docs/content_quality_notes.md` | Search/snippet/metadata quality |
| `docs/next_codex_target.md` | **Exact next coding task** |

## Running the Stack

```bash
# Terminal 1 - PostgreSQL
brew services start postgresql@17

# Terminal 2 - Backend
cd ~/Desktop/veridicta/veridicta
export DATABASE_URL="postgresql://antho@localhost/veridicta_m1"
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000

# Terminal 3 - Frontend
cd ~/Desktop/veridicta/veridicta
npm run dev -- -p 3003
```

## Frontend URLs
- http://localhost:3003/dashboard/knowledge
- http://localhost:3003/dashboard/documents
- http://localhost:3003/dashboard/agents
