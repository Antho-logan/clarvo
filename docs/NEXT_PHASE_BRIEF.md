# Next Phase Brief — After Code-Finish

**Precondition:** code-finish is complete, CI/local verification is green, and `CURRENT_STATE_OF_TRUTH.md` still describes reality.

The project is done with code-finish. The next phase is not code. It is data, operations, and judgment.

---

## The shift

Up to this point the question was "does the system work end-to-end?" The answer is yes: ingestion, retrieval, grounded assistant, evals harness, CI, frontend, auth — all present, all tested, all green.

From here the question becomes "does the system give a Dutch lawyer a trustworthy answer on a real question?" That question is not answered by writing more code. It is answered by loading a real corpus, populating embeddings, running the eval harness against that corpus, and auditing citations by hand.

---

## Phase outline

### Phase A — Populate embeddings
- Set `OPENAI_API_KEY` in the environment (local or staging).
- Run `python3 scripts/embedding_coverage_report.py --refresh` to see the starting state.
- Run `python3 create_embeddings.py --mode missing --limit 500 --page-size 100` in bounded pages. Checkpoint after each page. See `embedding_lifecycle_runbook.md`.
- Watch for: blank document text skips, dimension mismatches, and the `embedding_status` transitions in `documents`.
- Expected end state: `embedding_status = 'completed'` on the vast majority of the 13,112 legislation rows and 1,234 judgment rows. `stale` and `failed` rows visible in the coverage report.

### Phase B — Corpus expansion on the three priority domains
- Employment, tenancy, administrative. Nothing else.
- Start from the 18 BWB IDs per domain in `config/seeds/curated_laws.yaml`. Decide whether each priority domain needs more coverage and, if so, extend the seed file (data, not code).
- Continue to ingest Rechtspraak judgments where they meaningfully exercise the priority domains.
- Every corpus change triggers another Phase A pass for the new rows.

### Phase C — Real eval signal
- Re-run the 30-question curated eval (`python3 evals/run_eval.py`) against the populated corpus.
- Interpret per-domain `hit@10`, `mrr@10`, `recall@10`. Thresholds in the harness are placeholders; after a real corpus run, set thresholds that reflect the corpus.
- If a domain is below target, the correct fix is almost always corpus (seeds) or query-side (curated eval phrasing) — not retrieval-code changes. Confirm before touching code.

### Phase D — Citation audit
- Manually read the top assistant answers against the three domains.
- Every citation must be an article that actually supports the sentence it is attached to. Wrong article, right statute is still a fail.
- This is a human review pass. It does not belong to Codex.
- Findings feed back into Phase B (corpus) or Phase C (evals). They do not feed back into code.

### Phase E — Manual legal review
- A Dutch lawyer (not a developer) runs the MVP check flow in `mvp_finish_runbook.md` on a populated, embedded corpus.
- Confirms the `insufficient_sources` refusal path triggers correctly on out-of-domain questions.
- Confirms the grounded path answers cleanly on in-domain questions, with citations that survive a read-through.

---

## What explicitly does NOT happen in this phase

- No new product surfaces (see `REJECTED_OR_SUPERSEDED_DECISIONS.md`).
- No reranker. No cross-encoder. No Redis query-embedding cache.
- No Supabase. No agent-framework swap.
- No EU law, no SSO, no permanent uploads. Current-chat PDF/DOCX/text extraction is allowed only as ephemeral assistant context.
- No retrieval-algorithm tuning without an eval signal that motivates it.

The temptation in this phase will be to return to code because code is where the team is most comfortable. Resist it. The remaining risk is content, not code.

---

## Exit criteria for this phase

1. Embedding coverage ≥ 95% on the three priority domains.
2. 30-question eval hits stable, documented thresholds on a populated corpus.
3. A Dutch lawyer has completed at least one manual audit pass with zero fabricated citations.
4. The assistant refuses (returns `insufficient_sources`) on known out-of-domain queries.

When all four hold, the MVP is shippable.
