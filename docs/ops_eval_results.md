# Retrieval Evaluation — Phase 5

**Date:** 2026-04-27
**Status:** BLOCKED (depends on embeddings)

## What Was Attempted

1. Ran `python evals/run_eval.py` → requires embeddings to be present
2. Without vector embeddings, retrieval quality cannot be evaluated

## Evaluation Plan (once unblocked)

The eval script at `evals/run_eval.py` should test:

### Test Queries (Dutch Legal)

| # | Domain | Query | Expected Source |
|---|--------|-------|----------------|
| 1 | tenancy | opzegging huur woonruimte | BWBR0005290 Boek 7 |
| 2 | tenancy | servicekosten huurder verhuurder | BWBR0005290 |
| 3 | tenancy | huurprijs verhoging maximum | BWBR0005290 |
| 4 | employment | opzegverbod na ziekte werkgever | BWBR0014315 |
| 5 | employment | transitievergoeding berekening | BWBR0014315 |
| 6 | employment | concurrentiebeding geldigheid | BWBR0014315 |
| 7 | administrative | bezwaar maken tegen besluit | Awb |
| 8 | administrative | bestuursorgaan bevoegdheid | Awb |
| 9 | administrative | termijn beroep bestuursrecht | Awb |
| 10 | cross-domain | ontslag tijdens huurachterstand | BWBR0014315 + BWBR0005290 |

### Metrics to Collect

- **Recall@5** — fraction of queries where the correct source appears in top 5
- **MRR** — mean reciprocal rank of correct source
- **BM25-only baseline** — for comparison after embeddings are added

## BM25 Baseline (pre-embeddings)

BM25 search returned **0 hits** for all 10 test queries when tested directly via Python. This suggests:
- Dutch text tokenization may not be working correctly (no Dutch stemmer)
- The `plainto_tsquery` function may not be parsing Dutch legal terms
- This is a **critical bug** to investigate regardless of embedding status

### Recommended: Run this command once embeddings exist
```bash
cd /mnt/c/Desktop/veridicta
source .venv/bin/activate
export $(grep -v '^#' .env | xargs)
python evals/run_eval.py
```
