# Next Codex Target

## Exact Next Coding Milestone

**Fix the domain filter bug on /dashboard/agents and improve search example queries to return results.**

## Files/Pages to Touch

1. **Frontend:**
   - `src/app/dashboard/agents/page.tsx` - Fix domain filter behavior
   - Possibly `src/lib/api.ts` - Check how domain filter is applied

2. **Example queries to fix:**
   - Update the example query links to use simpler terms that return hits
   - Or remove domain filter from example links to allow broader results

## What NOT to Touch

- Do NOT modify backend search.py or BM25 implementation
- Do NOT add new backend endpoints
- Do NOT work on authentication/user flows
- Do NOT expand ingestion pipelines
- Do NOT redesign the UI shell
- Do NOT add new features beyond fixing these specific issues

## Expected Outcome

1. **Example queries on /dashboard/agents should return results:**
   - "huurcontract servicekosten opzegtermijn" should return hits (or use simpler query)
   - Current issue: domain=tenancy_law filter narrows to empty results

2. **Cleaner empty states:**
   - Replace "0 hits" with user-friendly message
   - Suggest broader search terms

3. **Verification:**
   - After fix, click each example query link and confirm results appear

## Why This Target

The product is close to demo-ready. The core retrieval engine works - real Dutch legal data is searchable. The main blocker is that the domain filter on the Assistant page is too restrictive, making example queries fail. This is a quick fix that will make the product feel much more polished.

## Test Commands

```bash
# Backend should stay running on port 8000
curl http://localhost:8000/search?q=huurcontract&limit=5

# Frontend runs on port 3003
# Visit http://localhost:3003/dashboard/agents
# Click example query links - should return results after fix
```
