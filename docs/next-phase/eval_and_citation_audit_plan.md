# Eval and Citation Quality Audit Plan — Veridicta

**Purpose:** Design a serious, ongoing evaluation and citation quality audit system for Veridicta's post-MVP phase.

---

## What Already Exists

The codebase already has:
- `evaluation.py` — `compute_ranking_metrics()` with P@k, R@k, F1@k, MRR, nDCG@k
- `evals/run_milestone2_eval.py` — runs eval against stored documents, reports pass/fail
- `evals/check_eval_regression.py` — CI gate to fail on regression beyond threshold
- `evals/tests_milestone2.json` — 6 test cases (3 legislation, 3 case law), 2 assistant cases
- `agentic_orchestrator.py` — grounded assistant with citation extraction
- BM25 + vector hybrid search already instrumented with scores

### What's Missing for a Production Eval System

1. **A proper test question bank** — 5 questions per domain is not enough
2. **Ground-truth annotation** — someone has to say which documents are "correct" for each question
3. **Citation quality scoring** — not just "did we retrieve the right doc" but "did the assistant cite it correctly"
4. **Citation audit trail** — logs of what the assistant actually said vs. what the source says
5. **Automated regression alerts** — no Slack/email alerting yet
6. **Retrieval latency SLOs** — no P50/P95 latency tracking

---

## Part 1: Retrieval Eval Design

### Metric Selection

For a Dutch legal retrieval system, the following metrics matter:

| Metric | Why | Target |
|--------|-----|--------|
| nDCG@10 | Gold standard for ranking. Penalizes relevant docs at rank 2+ less than rank 1. | > 0.75 |
| Recall@10 | "Did we find at least one of the relevant docs?" For legal research, missing a relevant judgment is worse than returning extra noise. | > 0.80 |
| Precision@10 | "Are returned docs actually relevant?" High precision reduces hallucination risk. | > 0.60 |
| MRR | "Where is the first relevant result?" Important for citation lookup (ECLI search). | > 0.85 |
| P@3 | For legal questions, top-3 citations are what users read. | > 0.70 |

**Do NOT use accuracy** — irrelevant for retrieval.

### Ground Truth Construction

Ground truth = for a given question Q, which `source_id` (BWB ID or ECLI) should be in the top-k results?

**How to build ground truth for each domain:**

1. **Human legal expert** (Dutch law background) reviews corpus and marks relevant docs per question
2. **For legislation questions:** The relevant BWB ID is usually deterministic — one primary law governs the question
3. **For case law questions:** ECLIs are harder — a question like "non-compete enforceability" may have 3–5 relevant cases

**Minimal ground truth per domain:**
- Employment: 20 questions × 3 relevant ECLIs + 2 relevant BWBs = 100 annotations
- Tenancy: 15 questions × 3 relevant ECLIs + 2 relevant BWBs = 75 annotations
- Administrative: 15 questions × 3 relevant ECLIs + 3 relevant BWBs = 90 annotations

**Total: ~265 annotations for baseline eval coverage.**

### Eval Question Bank (Starter Set — for agents to expand)

These are real Dutch legal question types, not hypotheticals:

#### Employment Law
1. "Wat is de opzegtermijn bij ontslag via UWV?" → BWBR0002645 (7:672 BW)
2. "Kan een werkgever een werknemer op staande voet ontslaan zonder voorafgaand gesprek?" → ECLI:NL:RBROT:2022:5820
3. "Wanneer is een non-concurrentiebeding nietig?" → BWBR0002645 (7:653 BW)
4. "Wat zijn de rechten van een werknemer bij een reorganisatie?" → BWBR0002829 (WOR)
5. "Mag een werkgever een werknemer ontslaan tijdens ziekte?" → BWBR0002645 (7:670 BW)
6. "Hoe werkt de ketenregeling bij opeenvolgende tijdelijke contracten?" → BWBR0002645 (7:668 BW)
7. "Wat is het verschil tussen bedrijfseconomische redenen en verstoorde arbeidsrelatie?" → ECLI:NL:GHAMS:2023:XXXX
8. "Wanneer is een vaststellingsovereenkomst verstandig in plaats van ontslag?" → ECLI:NL:HR:2023:XXXX

#### Tenancy Law
1. "Wat is de wettelijke opzegtermijn voor huur van woonruimte?" → BWBR0005290 (7:271 BW)
2. "Kan een verhuurder de huur opzeggen voor eigen gebruik?" → BWBR0005290 (7:274 BW)
3. "Wat zijn de vereisten voor een huurprijsverhoging?" → BWBR0005290 (7:281 BW)
4. "Wanneer kan de huurder de huurprijs betwisten bij de huurcommissie?" → BWBR0014315
5. "Wat is de minimale huurtermijn bij tijdelijke huurcontracten?" → BWBR0005290 (7:271)
6. "Mag een verhuurder de huur opzeggen wegens achterstallige betaling?" → BWBR0005290 (7:272)

#### Administrative Law
1. "Wat is het verschil tussen bezwaar en beroep in de Awb?" → BWBR0005537 (ch. 6–7 Awb)
2. "Wanneer kan een bestuursorgaan een last onder dwangsom opleggen?" → BWBR0005537 (5:31 Awb)
3. "Wat is het proportionaliteitsbeginsel in het bestuursrecht?" → BWBR0005537 (3:4 Awb)
4. "Kan een vreemdeling in bezwaar gaan tegen een visumweigering?" → BWBR0018603 (Vw 2000)
5. "Wat zijn de gevolgen van niet-tijdig beslissen door een bestuursorgaan?" → BWBR0005537 (4:17 Awb)
6. "Wanneer is een bestuurlijke boete onevenredig?" → BWBR0005537 (5:46 Awb)

### How Often to Run Evals

| Event | Action |
|-------|--------|
| After every bulk ingestion (>50 new documents) | Run full eval suite, report to operator |
| After embedding model change | Run full eval suite + regression check |
| Every 2 weeks (scheduled) | Run full eval suite, compare to baseline |
| Before every release / demo | Run full eval suite, must pass P@10 > 0.60, nDCG@10 > 0.75 |
| CI/CD pipeline | Run fast subset (n=10 questions) — regression check only |

### Eval Script Improvements Needed

The existing `run_milestone2_eval.py` is a good start. Required improvements for the next phase:

1. **Add ground truth file per domain** — `evals/ground_truth_employment.json`, `evals/ground_truth_tenancy.json`, `evals/ground_truth_administrative.json`
2. **Add domain-filtered eval** — `python evals/run_milestone2_eval.py --domain employment_law`
3. **Add latency reporting** — time the hybrid_search call, report P50/P95
4. **Add JSON report output** — already done, but include latency metrics in report
5. **Add regression alerting** — if `check_eval_regression.py` fails, send a cron job notification to the operator

---

## Part 2: Citation Quality Audit Design

### What "Citation Quality" Means

Retrieval quality answers: "Did we find the right document?"
Citation quality answers: "Does the assistant's claim about that document match what the document actually says?"

A bad citation can be:
1. **Hallucinated citation** — assistant cites BWBR0002645 for a claim that is not in that law
2. **Mismatched article** — assistant cites "artikel 7:271" but the retrieved chunk discusses 7:272
3. **Out-of-context citation** — the law exists and the article exists, but the retrieved passage doesn't support the specific claim
4. **Date/court error** — assistant misstates the court, date, or jurisdiction of a judgment
5. **Incomplete citation** — assistant omits the article number or section, making verification harder

### Citation Audit Methodology

**Two-stage audit:**

#### Stage 1: Automated Hallucination Detection (Agent runs, every query)

The assistant's output is checked against retrieved document text:

```python
def audit_citation(answer: str, retrieved_chunks: list[dict]) -> dict:
    """
    Check if each [BWB_ID] or [ECLI] citation in the answer
    is supported by the retrieved chunk text.
    """
    cited_ids = extract_citations(answer)  # regex for BWBR*, ECLI:NL:*
    checks = []
    for cited_id in cited_ids:
        chunk = find_chunk_by_source_id(cited_id, retrieved_chunks)
        if not chunk:
            checks.append({"citation": cited_id, "status": "NOT_RETRIEVED"})
            continue
        # Check: does the answer text near the citation marker
        # contain content from the chunk?
        snippet = extract_answer_snippet(answer, cited_id)
        overlap = text_overlap(snippet, chunk["text"])
        checks.append({
            "citation": cited_id,
            "status": "SUPPORTED" if overlap > 0.3 else "WEAK_SUPPORT",
            "overlap_score": overlap,
        })
    return {"checks": checks, "all_supported": all(c["status"] == "SUPPORTED" for c in checks)}
```

**Thresholds:**
- `overlap > 0.3` — supported: the answer text near the citation shares significant text with the retrieved chunk
- `overlap 0.1–0.3` — weak support: partial match, flag for human review
- `overlap < 0.1` — hallucinated: citation not backed by retrieved text, must block answer

#### Stage 2: Human Citation Review (Scheduled, random sample)

- **Sample size:** 10% of all assistant answers, randomly selected each week
- **Reviewers:** Human with Dutch law background (Antho or a legal domain expert)
- **Review criteria:**

| Criterion | Score | Definition |
|-----------|-------|-----------|
| Correct source cited | 1/0 | Is the BWB ID or ECLI correct for the claim? |
| Correct article/section | 1/0 | Is the article/section cited correctly? |
| Accurate summary | 1/0 | Does the assistant's summary accurately represent the source? |
| No material omission | 1/0 | Did the assistant omit a key qualification that changes the meaning? |
| Appropriate confidence | 1/0 | Did the assistant correctly say "cannot answer" when sources don't support the claim? |

**Total score per answer:** 0–5. Answers scoring <3 are flagged for fix.

### Citation Audit Schedule

| Frequency | Who | Action |
|-----------|-----|--------|
| Every assistant answer (automated) | OpenClaw agent | Run hallucination detection, log to `citation_audit_log` table |
| Weekly (random 10% sample) | Human | Score 5–10 answers manually, record in `citation_audit_log` |
| After every ingestion | Hermes agent | Run audit on a fixed set of 20 "canonical" questions, compare to previous run |
| Monthly | Human | Review audit trends, identify systematic failure patterns |

### Citation Audit Log Schema

Add a new table for audit results:

```python
class CitationAuditLog(Base):
    __tablename__ = "citation_audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    cited_source_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    audit_status: Mapped[str] = mapped_column(Text, nullable=False)  # "automated_pass", "automated_fail", "human_reviewed"
    automated_score: Mapped[float] = mapped_column(Float, nullable=True)  # 0.0–1.0
    human_scores: Mapped[dict] = mapped_column(JSONB, nullable=True)  # {"correct_source": 1, "correct_article": 1, ...}
    total_human_score: Mapped[int] = mapped_column(Integer, nullable=True)  # 0–5
    reviewed_by: Mapped[str] = mapped_column(Text, nullable=True)  # "agent" or human name
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
```

---

## Part 3: What OpenClaw/Hermes/Operator Agents Should Review

### OpenClaw (Frontend Agent — Human in Loop)

- **What it reviews:** Any answer flagged by automated hallucination detection
- **Threshold:** If `audit_citation()` returns `all_supported=False`, the answer is held for human review before delivery to the user
- **What it does:** Reviews the citation, confirms or overrides, logs decision
- **What it does NOT do:** Changes the retrieval strategy or model parameters

### Hermes (Orchestration Agent)

- **What it reviews:** Full eval reports after ingestion batches
- **What it does:** Runs `evals/run_milestone2_eval.py`, interprets results, pages human if nDCG@10 drops > 5% below baseline
- **What it does NOT do:** Decide to change embedding models or index parameters without human approval

### Codex (Implementation Agent)

- **What it reviews:** Regression check failures in CI
- **What it does:** Investigates what changed (new documents, new chunking, model update), proposes a fix, implements with human approval
- **What it does NOT do:** Push fixes directly to production without human review of the fix

### Human / Operator

- **What only humans do:**
  - Create and approve ground truth annotations for new questions
  - Score Stage 2 human review of citation audit samples
  - Approve embedding model changes
  - Approve changes to eval thresholds
  - Decide when a systematic failure requires re-indexing or re-chunking

---

## Part 4: Eval Infrastructure Gaps to Fill

| Gap | Priority | Owner |
|-----|---------|-------|
| Ground truth annotation files per domain | HIGH | Human |
| Citation hallucination detection script | HIGH | Codex |
| `citation_audit_log` table + repository | HIGH | Codex |
| Domain-filtered eval runner | MEDIUM | Codex |
| Latency reporting in eval | MEDIUM | Codex |
| Scheduled eval cron job | MEDIUM | Hermes |
| Automated regression alerting (Slack/email) | LOW | Hermes |
| P50/P95 latency SLO tracking | LOW | Operator |

---

## Part 5: Precision / Recall / Citation Metrics That Matter

### Retrieval Metrics (Already Implemented)

- nDCG@10 > 0.75 (primary)
- Recall@10 > 0.80 (primary)
- Precision@10 > 0.60 (secondary)
- MRR > 0.85 (for ECLI lookups)

### Citation Quality Metrics (New)

| Metric | Formula | Target |
|--------|---------|--------|
| Citation support rate | % of cited passages with overlap > 0.3 | > 95% |
| Hallucination rate | % of answers with no-support citations | < 2% |
| Appropriate refusal rate | % of out-of-scope questions correctly refused | > 90% |
| Human citation accuracy | Mean human score (0–5) on sample | > 4.0 |

---

## Part 6: Eval Schedule Summary

| When | What | Who |
|------|------|-----|
| Every query (live) | Automated hallucination check | OpenClaw |
| After 50+ new docs | Full eval suite | Hermes |
| Every 2 weeks | Scheduled full eval | Hermes (cron) |
| Before release/demo | Full eval + regression check | Codex |
| Every week | 10% sample human citation audit | Human |
| Every month | Audit trend review | Human |
| CI/CD | Fast regression subset (n=10) | Codex |
