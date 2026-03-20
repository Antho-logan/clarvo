# Veridicta Live Issues TODO

## Issues List

| Issue | Severity | Page/System | Likely Cause | Recommended Fix | Safe for Codex |
|-------|----------|-------------|--------------|-----------------|----------------|
| Domain filter too restrictive on Assistant page | High | /dashboard/agents | Query string includes domain= param narrowing results | Remove domain filter from example query links or ensure data exists for filtered domains | Yes |
| "Unknown Source" label displayed | Medium | /dashboard/documents | Frontend not mapping source_type to readable label | Add source_type label mapping in UI component | Yes |
| "Unassigned Domain" displayed in filter | Medium | /dashboard/documents | domain field populated but UI showing fallback | Check document data domain values vs UI display logic | Yes |
| Example queries return 0 hits | High | /dashboard/agents | Query too specific, not enough data | Use simpler example queries or expand dataset | Yes |
| Limited data volume (~30 docs) | High | Backend | Ingestion limited to small curated set | Run more ingestion jobs for broader coverage | Yes |
| Empty state shows "0 hits" message | Low | /dashboard/agents | No results returned | Improve empty state copy to be more user-friendly | Yes |
| Title fields look raw (long BWBR strings) | Medium | All pages | Backend returns full raw titles | Truncate titles in UI or use article/subject for display | Yes |
| Search relevance scores low (0.1-0.5) | Medium | /search | BM25 scoring may need tuning | Review search.py BM25 implementation | Yes |

## Priority Order

1. **Fix domain filter on Agents page** - breaks example queries
2. **Expand dataset** - core product requirement
3. **Fix UI labels** - trust/credibility issue
4. **Improve example queries** - makes demo work
