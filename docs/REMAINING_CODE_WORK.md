# Remaining Code Work

**Status:** complete.

This file is intentionally retained as the closure marker for the code-finish phase. It no longer tracks actionable engineering tasks.

The final code-finish cleanup has landed:

- Duplicated root-level markdown files were removed.
- Superseded upgrade-plan prompts and stale planning docs were removed.
- `README.md` and `docs/mvp_finish_runbook.md` now use Alembic for schema setup.
- The vestigial `embedding_legacy` model/column path was removed with Alembic coverage.
- `docs/` contains only the current source-of-truth docs and surviving MVP/embedding runbooks.

Do not add new code-finish tasks here unless a verified broken issue is found in the current implementation. The project has moved out of code-finish.

## Next Phase

Future work belongs in `docs/NEXT_PHASE_BRIEF.md`.

The next phase is data, operations, and quality review:

- Embeddings coverage and backfill.
- Corpus expansion for the three locked MVP domains: employment, tenancy, and administrative law.
- Evals on the populated corpus.
- Manual citation audit.

These are not feature-sprint tasks and should not reopen code-finish.

## Explicitly Not Next

- No Supabase work.
- No EU law ingestion.
- No agent-framework replacement.
- No reranker, cross-encoder, or query-embedding cache without eval evidence.
- No expansion of Matters or Workflows.
- No upload, OCR, export, or generated-document features.
- No redesign or new product surface.
- No refactor of search, ingestion, assistant, auth, or embeddings unless a real broken issue is found.
