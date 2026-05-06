# Open Questions — Next Phase

**Purpose:** Document the unresolved decisions that block or gate specific implementation steps. These require human judgment or external research before agents can proceed.

---

## Corpus Expansion

### Q1: How to programmatically discover BWB IDs?

**Blocker:** The corpus expansion plan requires finding the right BWBR IDs for employment, tenancy, and administrative sub-domains. The current ingestion uses known BWB IDs from seed files. How do we find them programmatically?

**Options:**
1. Use the BWB repository catalog API — does `repository.officiele-overheidspublicaties.nl` expose a machine-readable catalog?
2. Scrape the wetten.nl search — likely violates ToS
3. Use the official Overheid.nl API for legislation metadata
4. Manually curate the BWB ID list — most reliable short-term

**Owner:** Gemini research → Human decides → Hermes writes seed files

---

### Q2: Does the Rechtspraak Open Data `zoeken` endpoint support `rechtsgebied` filter?

**Blocker:** If we cannot filter Rechtspraak search results by domain (arbeidsrecht, huurrecht, bestuursrecht), we must use keyword search and post-filter. This affects whether `rechtspraak_search_client.py` needs a new method.

**How to resolve:** Check the Rechtspraak Open Data documentation at `https://data.rechtspraak.nl/uitspraken/zoeken` or test the endpoint with `rechtsgebied=arbeidsrecht`.

**Owner:** Gemini → Codex implements

---

### Q3: BWB version pinning?

**Blocker:** BWB IDs can have multiple versions (e.g., BWBR0002645 has amendments). Should Veridicta pin a specific `data_sid` (publication date), always fetch latest, or track versions in the `documents` table?

**Current state:** No versioning in the model. Re-ingesting the same BWB ID may create duplicates.

**Owner:** Human decides → Codex implements

---

### Q4: Rechtspraak document type filter?

**Blocker:** Should we ingest `type=conclusie` (Advocate General opinions) alongside `type=uitspraak`? Opinions are legally significant (especially from the Hoge Raad) but add noise to the corpus.

**Options:**
- Ingest both, tag with `document_type='opinion'` vs `'judgment'`
- Ingest opinions only for Hoge Raad
- Skip opinions entirely

**Owner:** Human decides

---

### Q5: Chunking strategy for long laws (Book 7, Awb)?

**Blocker:** Book 7 (BWBR0002645) and the Awb (BWBR0005537) are large documents. The current chunking is at the document level (one chunk per law). For employment law and administrative law, article-level or section-level chunking would significantly improve retrieval precision.

**Question:** Should we re-chunk existing laws at article granularity? This would require re-ingestion and re-embedding of the entire document set.

**Owner:** Human decides → Codex implements if approved

---

## Embedding / Storage

### Q6: Supabase connection — pooler vs. direct connection?

**Blocker:** Supabase's default connection string uses PgBouncer (port 6543) for connection pooling. PgBouncer in transaction-mode is incompatible with some PostgreSQL session features. Alembic migrations may fail. The skill plan recommends a separate "migrations" connection string on port 5432.

**Question:** Do we need two DATABASE_URLs (one for app, one for migrations), or does the pooler handle migrations correctly?

**Answer needed from:** Supabase documentation or testing

**Owner:** Human sets up → Codex tests

---

### Q7: HNSW index parameters?

**Blocker:** The migration plan uses `m=16, ef_construction=64`. These are sensible defaults but not tuned.

**Questions:**
- `m`: 16 is standard. Should we try 32 for higher recall?
- `ef_construction`: 64 is standard. Higher = better recall, slower build. For <10k documents, any value works.
- `ef_search`: Not set (uses default 40). Should we set it explicitly?

**Owner:** Codex can tune with evidence from eval runs

---

### Q8: Embedding backfill — acceptable downtime or live migration?

**Blocker:** If Supabase is adopted, running `create_embeddings.py` for 50k+ documents will take hours. Does this happen in a maintenance window or live?

**Options:**
- Maintenance window (8–12 hours, live search degrades to BM25-only)
- Live backfill with rate limiting (slower but no downtime)
- Pre-warm embeddings before go-live (preferred)

**Owner:** Human decides

---

## Evaluation

### Q9: Who creates ground truth annotations?

**Blocker:** The eval plan requires 265+ ground truth annotations (source_id per question). Someone with Dutch law knowledge must create these. This is a human task.

**Options:**
- Antho (human) creates them personally
- Antho supervises a legal expert
- Use LLM-as-judge as a temporary proxy (with known limitations)

**Owner:** Human (cannot be delegated to agents)

---

### Q10: Eval threshold — what is the minimum acceptable bar?

**Blocker:** The eval plan sets targets (nDCG@10 > 0.75, Recall@10 > 0.80). Are these realistic for the current system at MVP? What should the actual thresholds be for go/no-go decisions?

**Current state:** No threshold set in CI. `check_eval_regression.py` uses a 5% regression threshold but no absolute minimum.

**Owner:** Human sets thresholds → Hermes enforces

---

## Citation Quality

### Q11: What overlap threshold for hallucination detection?

**Blocker:** The citation audit plan uses `overlap > 0.3` as the threshold for "supported." This is a heuristic. Too low = false passes. Too high = false blocks.

**Question:** Should 0.3 be validated against a human-reviewed sample before going live?

**Owner:** Human validates with sample → Codex calibrates

---

### Q12: What happens when hallucination is detected?

**Blocker:** The plan says "hold answer for human review." In a production system with many users, this creates a bottleneck. Should there be an automated fallback (e.g., "I found relevant sources but cannot confirm citation quality — here are the sources")?

**Owner:** Human decides policy

---

## Agent Operating Model

### Q13: How do agents share state securely?

**Blocker:** When Hermes delegates to Codex/Gemini/OpenClaw, they need a shared context. Currently, the session is Hermes's context window. Sub-agents have no memory of prior turns.

**Options:**
- Shared notes in `~/.hermes/` — Codex/Gemini read/write structured files
- Structured handoff format — Hermes produces a JSON brief for each sub-agent task
- Dedicated task board — Linear or Notion as shared task list

**Owner:** Human decides → Hermes implements

---

### Q14: Approval gates — what requires human vs. agent decision?

**Blocker:** The operating model defines "human approves X." What are the actual criteria? e.g., "If hallucination rate < 2%, agent can proceed without human review" vs. "any hallucination requires human review."

**Question:** Build an explicit decision table:

| Condition | Action |
|-----------|--------|
| Eval nDCG@10 regresses < 5% | Hermes approves fix |
| Eval nDCG@10 regresses > 5% | Human reviews |
| Ingestion failure rate < 5% | Hermes approves |
| Ingestion failure rate 5–10% | Human reviews |
| Ingestion failure rate > 10% | Rollback + human |
| Citation hallucination detected | Hold + page human |
| New domain ingestion | Human approves seed list first |

**Owner:** Human sets this table → Hermes implements as policy

---

### Q15: Supabase — self-hosted or hosted?

**Blocker:** The embedding strategy recommends Supabase for managed ops. But Antho may prefer self-hosted Postgres for cost control or data sovereignty reasons.

**Question:** What is the hosting preference? Self-hosted (Railway, Render, bare VM) or Supabase managed?

**Owner:** Human decides

---

## Technical / Product

### Q16: Multi-tenancy — when?

**Blocker:** Currently, Veridicta is single-tenant at the API level (user auth via Auth.js). But the `matter` system is per-user. Should multi-tenancy (firms with multiple users sharing a corpus) be a near-term concern?

**Implication:** Supabase Row Level Security (RLS) would need to be configured. The current Postgres setup has no RLS.

**Owner:** Human decides

---

### Q17: Product — what is the demo use case?

**Blocker:** The corpus expansion plan prioritizes domains by legal frequency. But the actual demo/pitch may require a specific use case (e.g., "lawyer quickly finds relevant tenancy cases").

**Question:** What is the primary demo scenario for the next phase? Employment law end-to-end? Tenancy law + admin law as support?

**Owner:** Human decides

---

## Summary — Priority Order for Resolution

| Priority | Question | Blocks |
|----------|----------|--------|
| P0 — blocks all | Q9 (ground truth annotation) | Eval system |
| P0 — blocks all | Q15 (hosting decision) | Supabase migration |
| P1 — blocks corpus | Q1 (BWB ID discovery) | Employment law ingestion |
| P1 — blocks corpus | Q2 (Rechtspraak filter) | ECLI discovery for new domains |
| P1 — blocks eval | Q10 (eval thresholds) | CI gate |
| P2 — blocks ops | Q13 (agent state sharing) | Multi-agent workflows |
| P2 — blocks ops | Q14 (approval gates) | Automated pipeline |
| P3 — nice to have | Q5 (chunking strategy) | Search quality |
| P3 — nice to have | Q16 (multi-tenancy) | Future scale |
