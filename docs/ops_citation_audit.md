# Assistant Citation Audit — Phase 6

**Date:** 2026-04-27
**Status:** BLOCKED (assistant crashes on embedding 403)

## What Was Attempted

10 Dutch legal questions were prepared for citation audit. The `/agent/chat` endpoint was tested via TestClient.

## Results

| # | Domain | Question | Status |
|---|--------|----------|--------|
| 1 | tenancy | Wat geldt bij opzegging van huur van woonruimte? | ❌ 500 — crashes on embedding 403 |
| 2 | tenancy | Wie betaalt servicekosten bij huur? | ❌ Not tested |
| 3 | tenancy | Hoeveel mag de huurprijs verhoogd worden? | ❌ Not tested |
| 4 | employment | Wat zijn de regels voor opzegverbod na ziekte? | ❌ Not tested |
| 5 | employment | Hoe berekent u de transitievergoeding? | ❌ Not tested |
| 6 | employment | Wanneer is een concurrentiebeding geldig? | ❌ Not tested |
| 7 | administrative | Hoe maak ik bezwaar tegen een besluit? | ❌ Not tested |
| 8 | administrative | Wat is een bestuursorgaan? | ❌ Not tested |
| 9 | administrative | Wat is de termijn voor beroep in bestuursrecht? | ❌ Not tested |
| 10 | cross | Kan ik ontslagen worden tijdens huurachterstand? | ❌ Not tested |

## Error Trace (abbreviated)

```
api/main.py:754 chat_agent → agentic_orchestrator.py:164 chat
→ tools/retrieval.py:57 _run → search.py:386 hybrid_search
→ search.py:208 vector_search → openai.PermissionDeniedError: 403
```

## Key Findings

1. **Auth works** — JWT with audience `veridicta-api` is correctly validated
2. **BM25 search returns 0 hits** — `search.py` logs `BM25 returned 0 hits` for all queries
3. **Vector search crashes** — 403 on embedding model before vector search even runs
4. **No graceful degradation** — the assistant should fall back to chat-only when retrieval fails

## Recommendations

1. **Fix embedding access** (priority 1)
2. **Add graceful fallback** — catch 403/embedding errors and respond with LLM-only answer
3. **Fix BM25 for Dutch** — investigate why `plainto_tsquery` returns 0 results for Dutch legal text
4. **Add health endpoint for search** — `/health` should check if embeddings are accessible

## Re-run Command (once fixed)

```bash
cd /mnt/c/Desktop/veridicta
source .venv/bin/activate
export $(grep -v '^#' .env | xargs)
export AUTH_SECRET=dev-secret-for-testing

# Start backend
uvicorn api.main:app --host 127.0.0.1 --port 8000 &

# Generate token and test
python -c "
import jwt, datetime
token = jwt.encode({'sub': 'test-user', 'aud': 'veridicta-api', 'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=24)}, 'dev-secret-for-testing', algorithm='HS256')
print(token)
" > /tmp/test_token.txt

for q in 'opzegging huur woonruimte' 'servicekosten huur' 'transitievergoeding'; do
  curl -s -X POST http://127.0.0.1:8000/agent/chat     -H "Content-Type: application/json"     -H "Authorization: Bearer $(cat /tmp/test_token.txt)"     -d "{"question": "$q"}"
done
```
