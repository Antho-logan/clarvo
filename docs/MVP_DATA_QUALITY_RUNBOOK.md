# MVP Data-Quality Runbook

**Last verified:** 2026-05-06.

Use this runbook for MVP data-quality verification only. It is not a feature roadmap.

---

## Required Local Environment

Production-like local corpus DB:

```bash
export DATABASE_URL="postgresql+psycopg://antho@localhost:5432/veridicta_m1"
```

Destructive test DB:

```bash
export TEST_DATABASE_URL="postgresql+psycopg://antho@localhost:5432/veridicta_test_phase1"
```

The test DB name must contain `test`; pytest fixtures drop and recreate its `public` schema.

---

## DB Tests

Run the full backend suite with DB integration tests enabled:

```bash
TEST_DATABASE_URL="postgresql+psycopg://antho@localhost:5432/veridicta_test_phase1" \
  python3 -m pytest -q
```

Collect skip reasons if anything skips:

```bash
TEST_DATABASE_URL="postgresql+psycopg://antho@localhost:5432/veridicta_test_phase1" \
  python3 -m pytest -q -rs
```

Expected current result: `111 passed`, zero skips.

Running without `TEST_DATABASE_URL` is allowed for unit-only smoke, but DB integration tests will skip:

```bash
python3 -m pytest -q -rs
```

---

## Embedding Coverage

Run the grouped coverage report:

```bash
DATABASE_URL="postgresql+psycopg://antho@localhost:5432/veridicta_m1" \
  python3 scripts/embedding_coverage_report.py
```

Optionally refresh lifecycle state before reporting:

```bash
DATABASE_URL="postgresql+psycopg://antho@localhost:5432/veridicta_m1" \
  python3 scripts/embedding_coverage_report.py --refresh
```

Current verified result: 14,346 total documents, 14,346 pending, 0 embedded.

---

## Embedding Backfill

Do not run this unless `OPENAI_API_KEY` is intentionally configured for this project. The current shell verification found no key set.

Backfill a small dry-run-sized batch first:

```bash
export DATABASE_URL="postgresql+psycopg://antho@localhost:5432/veridicta_m1"
export OPENAI_API_KEY="sk-..."
python3 create_embeddings.py --mode missing --limit 25 --page-size 25
python3 scripts/embedding_coverage_report.py
```

If the small batch succeeds and coverage/model/dimensions look correct, continue in bounded batches:

```bash
python3 create_embeddings.py --mode missing --limit 500 --page-size 100
python3 scripts/embedding_coverage_report.py
```

Expected model/dimensions after successful backfill: `text-embedding-3-small`, 1,536 dimensions.

Stop and inspect before continuing if any row moves to `failed`, if dimensions are not 1,536, or if coverage does not increase after a successful run.

---

## Evals

Curated retrieval eval:

```bash
DATABASE_URL="postgresql+psycopg://antho@localhost:5432/veridicta_m1" \
  python3 evals/run_eval.py
```

With no `OPENAI_API_KEY`, hybrid search runs BM25-only. Current verified BM25-only result: overall hit@10 0.967, MRR@10 0.626, recall@10 0.917.

Milestone-2 retrieval and assistant smoke eval:

```bash
DATABASE_URL="postgresql+psycopg://antho@localhost:5432/veridicta_m1" \
  python3 evals/run_milestone2_eval.py
```

Current verified result fails: 6 passed, 2 failed, assistant 1 passed / 1 failed. Treat this as a data-quality blocker to investigate, not as a code-success claim.

Regression check after generating a new milestone report:

```bash
python3 evals/check_eval_regression.py \
  --baseline evals/reports/baseline.json \
  --latest-dir evals/reports \
  --metric ndcg@10 \
  --max-regression 0.05
```

---

## Citation Audit Checklist

- Every grounded answer has at least one citation object.
- Citation labels in answer text match returned citation metadata.
- Citation `source_id`, `bwbr_id` or `ecli`, `title`, and article/date fields are populated when available.
- Source snippets support the actual answer sentence they are attached to.
- No citation points to an unrelated domain after filters are applied.
- Case-law citations include ECLI where available.
- Legislation citations include BWB/BWBR identifier and article where available.
- Answers with weak or empty retrieval do not cite irrelevant fallback sources.

---

## Refusal Behavior Checklist

- No-source or low-source queries return `status="insufficient_sources"`.
- Refusal text states that the system lacks enough source material; it does not invent legal conclusions.
- Refusal responses still expose any retrieved partial sources separately for inspection.
- Out-of-domain questions do not trigger broad, uncited legal advice.
- Missing `OPENAI_API_KEY` does not bypass grounding; extractive fallback must still cite or refuse.
- Assistant eval cases that expect refusal fail if the assistant returns a grounded answer without adequate sources.

---

## Frontend Verification

These commands do not validate legal truth, but they guard against breaking the existing app while doing data-quality work:

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

Do not run `npm install` on macOS in this repo. If the lockfile must be regenerated, follow `AGENTS.md` and do it inside `node:22-bookworm-slim`.
