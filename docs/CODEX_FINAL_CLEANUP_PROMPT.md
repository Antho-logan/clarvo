# Final Codex Cleanup Prompt

**Status:** completed. This file is historical and must not be used as an active task prompt.

The cleanup described here was the last code-finish pass on `codex/upgrade-to-10`. Its actionable items have already landed:

- Deleted duplicated root-level markdown files.
- Deleted superseded upgrade-plan prompts and stale docs.
- Kept `docs/` aligned to the source-of-truth set.
- Replaced local setup references to `python3 init_db.py` with `python3 -m alembic upgrade head`.
- Removed the vestigial `embedding_legacy` model/column path with an Alembic migration.

For current project state, read `docs/CURRENT_STATE_OF_TRUTH.md`.

For the next phase, read `docs/NEXT_PHASE_BRIEF.md`.

For closed or rejected decisions, read `docs/REJECTED_OR_SUPERSEDED_DECISIONS.md`.

Do not rerun this prompt. Code-finish is complete unless a verified broken issue is found.
