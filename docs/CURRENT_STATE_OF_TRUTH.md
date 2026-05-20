# Veridicta Current State Of Truth

**Last verified:** 2026-05-21, local workspace `/Users/antho/Desktop/VERIDICTA-full`, branch `main`.
**Verification status:** embeddings complete, DB integration tests passed, frontend verification passed, demo-request route tested with configured Resend env, Legal Review Mode tested previously with OpenAI, and the 2026-05-21 local MVP QA pass found no P0 product blockers. Retrieval eval values below are historical from the 2026-05-06 pass unless rerun.

This file is the current operational source of truth. Older reports in `docs/` are historical unless their claims are reproduced here.

## Current Product Status

Veridicta is a **private-demo / beta-candidate** system with caveats. It is not public self-serve production-ready.

Safe current claims:

- Dutch legal corpus is loaded locally.
- Embedding coverage is complete locally.
- Retrieval eval passes the current curated gate.
- The grounded assistant can answer selected source-backed demo questions.
- Out-of-scope refusals now return zero citations.
- Legal Review Mode is implemented for current-chat uploaded documents with `[Contract D1.P1]` style references.
- Citation trust polish and uploaded-document review UX polish are complete.

Not safe to claim:

- Public self-serve production readiness.
- Complete legal coverage for all Dutch legal domains.
- Replacement of lawyer review.
- Enterprise production readiness.

## Repository And Deployment State

| Item | Current value |
| --- | --- |
| Branch | `main` |
| Latest pushed MVP checkpoint | `5705eb3cffb58061e227596cf476fa59b770b967` |
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
| DB/API pytest slice with `TEST_DATABASE_URL=postgresql+psycopg://antho@localhost:5432/veridicta_test` | 40 passed |
| Full Python pytest with `TEST_DATABASE_URL=postgresql+psycopg://antho@localhost:5432/veridicta_test` | 134 passed |
| `python3 -m pytest tests/test_assistant_grounding.py -q` | 9 passed |
| `python3 -m pytest tests/test_document_text_extraction.py -q` | 4 passed |
| `python3 evals/run_eval.py` | Historical pass from 2026-05-06; not rerun on 2026-05-20 |
| `python3 scripts/embedding_coverage_report.py` | 14,346 completed, 0 pending, 0 failed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test -- --run` | 13 files passed, 44 tests passed |
| `npm run build` | Passed |

## 2026-05-21 Local MVP QA Result

Result: no P0 product blockers found after Legal Review Mode, citation trust polish, and document review UX polish.

Verified locally:

- Landing loads Dutch-first; mobile language toggle works.
- Demo CTA opens the lead form.
- `/api/beta-access` returned `200 {"ok":true}` with a fake local QA payload and configured Resend env.
- `/dashboard` redirects to `/login` with `AUTH_DEV_BYPASS=false`.
- `/login` loads and public signup is not visible.
- Dashboard, Assistant, Matters, Knowledge, Documents/Vault, Workflows, Settings, and Onboarding load with dev bypass.
- UI Sandbox is not visible in normal navigation.
- Workflows remains roadmap/preview-only.
- Knowledge search and document browsing/detail routes load.
- Matters shows lawyer-review and source-trail language.

No fresh live OpenAI call was run during the 2026-05-21 QA pass to avoid unnecessary API use. The previous live Legal Review Mode smoke remains the latest live LLM proof; run one controlled live clause review immediately before the demo.

## Lead Capture State

The public landing page uses one demo CTA: `Vraag een demo aan` / `Request a demo`.
The form posts to `/api/beta-access`, which validates the payload and sends the lead through Resend.

Local route submission was tested on 2026-05-20. A personal sender failed with `502 Email delivery failed`; the Resend sandbox sender `Veridicta <onboarding@resend.dev>` succeeded through `/api/beta-access` with `200 {"ok":true}`. `BETA_LEAD_TO` can be a personal inbox for testing, but production `BETA_LEAD_FROM` must be a Resend-verified company-domain sender before launch.

Follow-up before launch:

1. Decide the final company sender/domain.
2. Verify that sender/domain in Resend.
3. Set deployment env vars: `RESEND_API_KEY`, `BETA_LEAD_TO`, and `BETA_LEAD_FROM`.
4. Restart/redeploy the app.
5. Submit one real `Vraag een demo aan` request and confirm the email arrives.

Remaining launch risk is operational rather than product-code P0: Resend needs a verified company sender/domain for production, Vercel env vars must be set, and the full public app requires hosted FastAPI plus a populated hosted PostgreSQL/pgvector database.

## Legal Review Mode State

Live Legal Review Mode was tested on 2026-05-20 with a short Dutch huurovereenkomst clause and OpenAI enabled.

Result:
- Status: `grounded`.
- Citations: 8 legal citations returned.
- Contract reference: answer included `[Contract D1.P1]`.
- Required headings present: `Korte conclusie`, `Contractpassage`, `Juridische regel`, `Risico`, `Aanbeveling`, `Bronnen/citaties`, and `Juristencontrole vereist`.

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
