# Veridicta Current State Of Truth

**Last verified:** 2026-05-19, local workspace `/Users/antho/Desktop/VERIDICTA-full`, branch `main`.
**Verification status:** embeddings complete, DB integration tests passed, frontend verification passed, demo-request route tested. Retrieval eval values below are historical from the 2026-05-06 pass unless rerun.

This file is the current operational source of truth. Older reports in `docs/` are historical unless their claims are reproduced here.

## Current Product Status

Veridicta is a **private-demo / beta-candidate** system with caveats. It is not public self-serve production-ready.

Safe current claims:

- Dutch legal corpus is loaded locally.
- Embedding coverage is complete locally.
- Retrieval eval passes the current curated gate.
- The grounded assistant can answer selected source-backed demo questions.
- Out-of-scope refusals now return zero citations.

Not safe to claim:

- Public self-serve production readiness.
- Complete legal coverage for all Dutch legal domains.
- Replacement of lawyer review.
- Enterprise production readiness.

## Repository And Deployment State

| Item | Current value |
| --- | --- |
| Branch | `main` |
| Latest pushed project checkpoint | `fd632aa64e9005358bb3789cb07a5d8b34599aa1` |
| Runtime DB used for verification | `veridicta_m1` |
| Test DB used for DB integration tests | `veridicta_test` |
| Frontend local port | `3001` |
| Backend local port | `8000` |

`.env.local` is local-only and must remain untracked.

## Corpus And Embedding State

| Metric | Value |
| --- | ---: |
| Total documents | 14,346 |
| Completed embeddings | 14,346 |
| Pending embeddings | 0 |
| Failed embeddings | 0 |
| Embedding model | `text-embedding-3-small` |
| Embedding dimensions | 1536 |

The previous stale claim that the local DB had zero embeddings has been superseded. The local DB is fully embedded as of this verification pass.

## Eval State

`python3 evals/run_eval.py` passed:

| Metric | Value |
| --- | ---: |
| overall hit@10 | 1.000 |
| overall mrr@10 | 0.904 |
| overall recall@10 | 0.967 |

This is a retrieval-quality gate, not a legal correctness guarantee.

## Verification State

| Check | Result |
| --- | --- |
| DB pytest with `TEST_DATABASE_URL=postgresql+psycopg://antho@localhost:5432/veridicta_test` | 124 passed |
| `python3 evals/run_eval.py` | Historical pass from 2026-05-06; not rerun on 2026-05-19 |
| `python3 scripts/embedding_coverage_report.py` | 14,346 completed, 0 pending, 0 failed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test -- --run` | 11 files passed, 36 tests passed |
| `npm run build` | Passed |

## Lead Capture State

The public landing page uses one demo CTA: `Vraag een demo aan` / `Request a demo`.
The form posts to `/api/beta-access`, which validates the payload and sends the lead through Resend.

Local UI submission was tested on 2026-05-19 and the modal returned the user-facing failure state. The likely blocker is Resend sender/domain authorization: `BETA_LEAD_TO` can be a personal inbox for testing, but `BETA_LEAD_FROM` must be a Resend-allowed sender such as `onboarding@resend.dev` for sandbox testing or a verified company-domain sender before launch.

Follow-up before launch:

1. Decide the final company sender/domain.
2. Verify that sender/domain in Resend.
3. Set deployment env vars: `RESEND_API_KEY`, `BETA_LEAD_TO`, and `BETA_LEAD_FROM`.
4. Restart/redeploy the app.
5. Submit one real `Vraag een demo aan` request and confirm the email arrives.

Build warnings observed are non-blocking:

- Next.js middleware/proxy convention warning.
- Tailwind config module-type warning.

## Assistant Reliability State

Assistant reliability fix pushed in commit `9410fbdbc14c876c4a25fe63f8993d95a0ec410e`.

Behavior now verified through the local backend:

| Scenario | Current behavior |
| --- | --- |
| Tenancy opzegging question | `grounded`, citations returned |
| Ontslag op staande voet question | `grounded`, citations returned |
| Loondoorbetaling tijdens ziekte question | `grounded`, citations returned |
| Combined huur/ontslag/ziekte question | `grounded`, citations returned |
| Full tax return request | `insufficient_sources`, 0 citations |
| German labor law request | `insufficient_sources`, 0 citations |
| Criminal pretrial detention request | `insufficient_sources`, 0 citations |
| "Can Veridicta replace my lawyer?" | `insufficient_sources`, 0 citations |

## Safe Demo Questions

- `Wat geldt bij opzegging van huur van woonruimte?`
- `Wanneer is ontslag op staande voet geldig?`
- `Wat geldt bij loondoorbetaling tijdens ziekte?`

For demos, ask one legal question at a time. Mixed multi-question prompts are intentionally guided back to a single-question workflow.

Use all demos with explicit caveats: Veridicta is a research assistant, citations must be inspected, and lawyer review remains required.

## Next Backend/Agent Phase

The repo is ready for the next backend/agent phase after worktree cleanup. Recommended next work:

1. Tighten citation evaluation around administrative-law statutory retrieval.
2. Add regression tests for multi-domain questions.
3. Add source relevance checks for refusal and insufficient-source paths.
4. Keep landing-page redesign/prototype work out of backend/agent commits.
