# Veridicta MVP Readiness Report

**Date:** 2026-05-06
**Status:** Private-demo / beta-candidate ready with caveats.

This report supersedes older readiness notes that referenced 9,649 embedded documents or zero embeddings. The current verified local corpus has 14,346 documents and complete embedding coverage.

## Executive Summary

Veridicta is ready for controlled private demos and beta-candidate review. It is not ready for public self-serve production use.

Current verified strengths:

- 14,346 documents loaded.
- 14,346 embeddings completed.
- 0 pending embeddings.
- 0 failed embeddings.
- Embeddings use `text-embedding-3-small` with 1,536 dimensions.
- Curated retrieval eval passes with overall `hit@10=1.000`, `mrr@10=0.904`, `recall@10=0.967`.
- DB integration tests pass: 114 passed.
- Frontend verification passes: lint, typecheck, Vitest, and production build.
- Assistant reliability fix is pushed: `9410fbdbc14c876c4a25fe63f8993d95a0ec410e`.

Primary caveats:

- Veridicta remains a research assistant, not a lawyer replacement.
- Citation quality still needs lawyer review before broader beta.
- Domain coverage is intentionally limited.
- Administrative-law statutory retrieval needs additional targeted hardening.

## Verified Data State

| Metric | Value |
| --- | ---: |
| Total documents | 14,346 |
| Completed embeddings | 14,346 |
| Pending embeddings | 0 |
| Failed embeddings | 0 |
| Embedding model | `text-embedding-3-small` |
| Embedding dimensions | 1536 |

## Verified Eval State

`python3 evals/run_eval.py` passed:

| Metric | Value |
| --- | ---: |
| overall hit@10 | 1.000 |
| overall mrr@10 | 0.904 |
| overall recall@10 | 0.967 |

## Verified Test State

| Check | Result |
| --- | --- |
| DB pytest | 114 passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test -- --run` | Passed |
| `npm run build` | Passed |

## Assistant Reliability State

Commit `9410fbdbc14c876c4a25fe63f8993d95a0ec410e` fixed the main citation audit reliability issues:

- Source text is compressed before chat synthesis.
- Refusal-like answers are not marked as grounded.
- Out-of-scope refusal paths return zero citations.
- Tax, German-law, criminal-detention, and lawyer-replacement questions short-circuit to clean refusal.

Verified local backend behavior:

| Question class | Status |
| --- | --- |
| Tenancy opzegging | Grounded with citations |
| Ontslag op staande voet | Grounded with citations |
| Loondoorbetaling tijdens ziekte | Grounded with citations |
| Combined huur/ontslag/ziekte | Grounded with citations |
| Full tax return | `insufficient_sources`, 0 citations |
| German labor law | `insufficient_sources`, 0 citations |
| Criminal preliminary detention | `insufficient_sources`, 0 citations |
| Lawyer replacement | `insufficient_sources`, 0 citations |

## MVP Readiness Classification

| Area | Status | Notes |
| --- | --- | --- |
| Corpus loaded | Ready | 14,346 documents |
| Embeddings | Ready | 100% complete, 0 failures |
| Retrieval eval | Ready | Current curated gate passed |
| Assistant refusal behavior | Beta-ready | Clean refusals now return 0 citations |
| Citation quality | Beta-candidate | Needs continued legal audit |
| Frontend build/test | Ready | Local checks passed |
| Public production | Not ready | Needs broader safety, monitoring, auth, and legal review |

## Safe Demo Positioning

Use the product as a source-backed legal research assistant. Every demo should state that outputs are starting points for qualified professionals and citations must be inspected.

Safe demo questions:

- `Wat geldt bij opzegging van huur van woonruimte?`
- `Wanneer is ontslag op staande voet geldig?`
- `Wat geldt bij loondoorbetaling tijdens ziekte?`
- `Wat geldt bij opzegging van huur van woonruimte, ontslag op staande voet en loondoorbetaling tijdens ziekte?`

Avoid public demos that imply Veridicta can replace a lawyer, provide tax filing services, answer foreign law, or cover unsupported criminal-law workflows.

## Next Recommended Work

1. Commit and keep the current docs/config/test cleanup separate from landing-page prototype work.
2. Continue citation-quality audit on administrative-law statutory questions.
3. Add regression tests for the expanded safe demo set.
4. Keep any landing redesign in a separate branch/commit after backend/agent work is clean.
