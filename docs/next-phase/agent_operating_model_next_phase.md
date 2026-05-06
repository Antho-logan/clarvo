# Agent Operating Model — Next Phase

**Phase:** Post-MVP — Corpus expansion, eval, citation quality, and operational stability

**Principle:** Agents should operate like a legal research team. Hermes is the senior partner (orchestrator). Codex is the associate (implementation). OpenClaw is the junior (execution with oversight). Gemini is the paralegal (research and data gathering). Humans are the partners (sign-off on consequential decisions).

---

## Division of Labor — Who Does What

### Hermes (Orchestration Agent — This Agent)

**Role:** Senior research partner, coordinator, escalation point.

| Task | What Hermes Does | What Hermes Does NOT |
|------|----------------|---------------------|
| Corpus expansion planning | Researches which BWB IDs and ECLIs to add next; writes seed YAML files | Does not run ingestion directly |
| Eval scheduling | Triggers `evals/run_milestone2_eval.py` after corpus changes; pages human on regression | Does not change eval thresholds without approval |
| Citation audit oversight | Reviews `citation_audit_log` weekly; identifies systematic failure patterns | Does not score individual citations |
| Architecture decisions | Proposes embedding/storage strategy changes; researches Supabase vs self-hosted | Does not implement database migrations |
| Project coordination | Delegates to Codex, OpenClaw, Gemini; tracks what is in progress | Does not write application code |
| Escalation | Pages human when: regression > 5%, hallucination rate > 2%, ingestion failure rate > 10% | — |

### Codex (Backend Implementation Agent)

**Role:** Associate developer — implements features, fixes bugs, handles database migrations.

| Task | What Codex Does | What Codex Does NOT |
|------|----------------|---------------------|
| Ingestion pipeline | Extends `curated_ingestion.py` for new domains; adds `discover_eclis()` to rechtspraak_search_client | Does not decide which domains to ingest |
| Search improvements | Improves `hybrid_search()` fusion logic; adds new filters; optimizes queries | Does not change embedding model |
| Migration scripts | Writes `alembic` migrations for schema changes; creates HNSW index migration | Does not run migrations in production without approval |
| Embedding pipeline | Runs `create_embeddings.py`; optimizes batch sizing | Does not change embedding model |
| Citation audit | Builds hallucination detection script; adds `citation_audit_log` table | Does not interpret legal correctness |
| Eval tooling | Adds domain-filtered eval; adds latency reporting; improves `check_eval_regression.py` | Does not define ground truth |
| Bug fixes | Investigates and fixes search quality issues found by Hermes or human | Does not change core retrieval logic without spec |

### OpenClaw (Frontend / Grounded Assistant Agent)

**Role:** Grounded assistant execution, live citation quality gate.

| Task | What OpenClaw Does | What OpenClaw Does NOT |
|------|--------------------|-----------------------|
| Live citation check | Runs automated hallucination detection on every assistant answer; holds low-quality answers | Does not modify the corpus |
| Answer delivery gate | If `audit_citation()` passes → deliver answer. If it fails → hold for human review | Does not override the gate decision |
| Retrieval path selection | Chooses BM25-only, vector-only, or hybrid based on query type and index availability | Does not change the index or embedding |
| Session logging | Logs all retrieval results and citation decisions to `citation_audit_log` | Does not interpret legal meaning |
| Grounded refusal | When insufficient sources → returns refusal message (already implemented in `agentic_orchestrator.py`) | Does not speculate |

### Gemini (Research / Parallel Investigation Agent)

**Role:** Paralegal — research, discovery, data gathering. Used for parallel investigation tasks.

| Task | What Gemini Does | What Gemini Does NOT |
|------|-----------------|---------------------|
| ECLI discovery | Uses `rechtspraak_search_client.py` to discover relevant ECLIs by domain; returns structured list | Does not write seed files directly |
| BWB ID research | Researches which BWB IDs are relevant for a new subdomain; finds the right publication | Does not ingest documents |
| Legal domain analysis | Maps Dutch legal question types to relevant rechtsgebied categories; identifies gaps in corpus | Does not implement code |
| Eval question writing | Drafts new eval questions for human review and annotation | Does not approve ground truth |
| Corpus quality check | Identifies which BWB articles or ECLI summaries are missing from current corpus | Does not decide what to add |

### Human (Antho / Domain Expert)

**Role:** Senior partner — strategic decisions, legal accuracy, sign-off.

| Task | What Human Does |
|------|----------------|
| Ground truth annotation | Reviews and approves ground truth for eval questions |
| Citation audit sample review | Scores the 10% weekly citation audit sample |
| Strategic direction | Decides: which domain to prioritize, when to change embedding model |
| Approval of production changes | Approves: Supabase migration, embedding model change, new domain launch |
| Escalation handler | Handles: hallucination complaint, retrieval failure, eval regression > 5% |
| Legal accuracy final check | Verifies that corpus additions are legally correct and current |

---

## Operational Workflows

### Workflow 1: Corpus Expansion (New Domain)

```
1. Human → Hermes: "Add immigration law to the corpus"
2. Gemini → researches: Which BWBR IDs for immigration? Which rechtsgebied for case law?
3. Gemini → outputs: List of BWBR IDs + suggested ECLI search queries
4. Hermes → writes: config/seeds/bwb_immigration.yaml + rechtspraak_immigration.yaml
5. Hermes → Codex: "Run dry-run ingestion for immigration domain"
6. Codex → runs: POST /ingest/curated-law with domain=immigration_law, dry_run=true
7. Codex → verifies: failure rate < 10%, reports to Hermes
8. Hermes → Human: "Dry run clean. Approve full ingestion?"
9. Human → approves
10. Codex → runs: Full ingestion, monitors failure rate
11. Codex → runs: python create_embeddings.py --limit N
12. Hermes → runs: python evals/run_milestone2_eval.py --domain immigration_law
13. Hermes → reports: nDCG@10, Recall@10 to Human
```

### Workflow 2: Eval Regression Detected

```
1. Hermes (cron) → runs: python evals/run_milestone2_eval.py
2. evals/check_eval_regression.py → detects: nDCG@10 dropped from 0.82 to 0.71 (> 5% threshold)
3. Hermes → pages Human: "Regression detected: nDCG@10 0.82 → 0.71"
4. Codex → investigates:
   - New documents ingested since last eval?
   - Embedding coverage drop?
   - Index still present?
5. Codex → reports: "17 new documents ingested yesterday, 3 have no embeddings. Run backfill?"
6. Human → approves backfill
7. Codex → runs: python create_embeddings.py --limit 20
8. Codex → re-runs eval
9. If still failing → escalate to Human for manual review
```

### Workflow 3: Citation Hallucination Detected (Live)

```
1. User → asks: "Kan mijn werkgever me ontslaan tijdens ziekte?"
2. agentic_orchestrator.py → generates_answer()
3. OpenClaw → audit_citation(answer, retrieved_chunks)
4. audit_citation() → "BWBR0002645 cited but overlap=0.08 (WEAK_SUPPORT)"
5. OpenClaw → holds answer, pages Human for review
6. Human → reviews: BWBR0002645 does support the claim (art. 7:670)
7. Human → overrides: "Answer is correct, update overlap threshold or fix chunk"
8. OpenClaw → delivers answer to user
9. OpenClaw → logs: citation_audit_log with human_override=true
```

### Workflow 4: Supabase Migration

```
1. Human → creates Supabase project at supabase.com
2. Human → gives connection string to Hermes
3. Hermes → Codex: "Migrate DATABASE_URL to Supabase"
4. Codex → updates: ~/.hermes/.env with new DATABASE_URL
5. Codex → runs: psql check + HNSW migration
6. Codex → verifies: document count matches pre-migration
7. Codex → runs: create_embeddings.py backfill for any unembedded docs
8. Codex → re-runs: evals with new Supabase instance
9. Hermes → reports: eval results, latency to Human
10. Human → approves or rolls back
```

---

## What Each Agent Should NOT Touch

| Agent | Do NOT Touch |
|-------|-------------|
| Hermes | Any database migration, SQL, schema changes, or code in `backend_common.py`, `search.py`, `create_embeddings.py` |
| Codex | Ground truth definitions, eval question drafting, legal accuracy decisions, corpus prioritization |
| OpenClaw | The database, ingestion jobs, embedding pipeline, or the `source_registry` table |
| Gemini | Code files, database schema, production configuration |
| Human | Implementation details — delegate to agents |

---

## Skill Requirements for Next Phase

These skills should be loaded for specific tasks:

| Task | Skills to Load |
|------|--------------|
| ECLI discovery research | `kilo-code` (for Gemini research delegation), `web` |
| Ingestion pipeline work | `kilo-code` (for Codex delegation) |
| Eval analysis | `plan` (Hermes analysis), `kilo-code` |
| Supabase migration | `kilo-code` (for Codex), `supabase-embedding` skill |
| Citation audit | `kilo-code` (for OpenClaw if needed) |
| Ground truth annotation | Manual — no skill needed, human task |

---

## Agent Communication Protocol

When agents need to pass work to another agent:

```
[Agent A] → produces: structured output in shared format
[Agent A] → notifies: Hermes with summary of what was done
[Hermes] → routes: to Agent B with specific instructions
[Agent B] → produces: output or action
[Hermes] → reports: to Human with summary and recommendation
[Human] → decides: approves / rejects / modifies
[Hermes] → implements: decision via Agent B
```

**Structured output format for agent handoffs:**
```json
{
  "task": "corpus_expansion_immigration",
  "agent": "gemini",
  "output": {
    "bwb_ids": ["BWBR0018603", "BWBR0012344"],
    "ecli_queries": ["rechtsgebied=vreemdelingenrecht"],
    "estimated_documents": 45,
    "priority": "HIGH"
  },
  "confidence": "HIGH",
  "next_action": "human_approval_needed"
}
```

---

## Summary: Who Owns Each Area

| Area | Owner | Supports | Final Approval |
|------|-------|---------|---------------|
| Corpus prioritization | Human | Hermes, Gemini | Human |
| Seed file creation | Hermes | Gemini | Human |
| Ingestion execution | Codex | Hermes | Hermes |
| Embedding pipeline | Codex | — | Hermes |
| Vector index management | Codex | Hermes | Human |
| Eval runs | Hermes | Codex | Human |
| Citation audit (automated) | OpenClaw | Hermes | OpenClaw |
| Citation audit (human sample) | Human | Hermes | Human |
| Ground truth annotation | Human | Gemini (drafting) | Human |
| Regression investigation | Codex | Hermes | Human |
| Supabase migration | Codex | Hermes | Human |
| Database migrations | Codex | — | Human |
