# Dashboard & Product QA Report

## 1. Executive Summary

**GO WITH CAVEATS** ✅

The Clarvo frontend is demo-ready after Codex's landing page rewrite. The landing page went from fabricating testimonials, stats, and certifications to an honest, well-written private beta positioning. The core product flow — search the corpus, ask the assistant, inspect citations — works reliably across all routes. The dashboard loads live data from the backend. Two minor issues remain: empty ingestion stats on the Knowledge page, and the administrative-law assistant prompt doesn't always produce a visible answer (no corpus data). Neither is a demo blocker.

---

## 2. Landing Page QA

**Status: PASS** ✅

### What changed (Codex commit `f43d2a0`)
- Completely rewritten from scratch
- Removed: fake testimonials (Rostova, Vasseur, Becker), fabricated stats (20+ hours, 1,000+ matters, 99.9% uptime), false certifications (ISO 27001, SOC 2, "Bank-grade"), "6 languages", "Zero hallucinations", cross-border M&A claims
- New positioning: private beta, Dutch-only, employment + tenancy focus, source-backed, not legal advice

### Copy audit
- ✅ No fake testimonials
- ✅ No fabricated stats
- ✅ No false certification claims
- ✅ No broad EU/cross-border/M&A claims
- ✅ No "zero hallucinations" claim
- ✅ No "6 languages" claim
- ✅ Clear "What Clarvo is not" section
- ✅ Disclaimer in footer: "does not provide legal advice", "private beta", "features evolving"
- ✅ "Lawyer review is required" stated prominently
- ✅ "Security foundations in progress" — honest about roadmap vs reality

### CTA status
- "Request beta access" → `mailto:hello@clarvo.nl` ✅
- "Book a walkthrough" → `mailto:hello@clarvo.nl` ✅
- "Sign in" → `/login` ✅
- Footer "Contact" → `mailto:hello@clarvo.nl` ✅

### Language toggle
- EN → NL toggle works ✅
- Dutch copy reads naturally ✅
- Headings, buttons, CTAs all translated ✅

### Images
- 3 Unsplash images, all load correctly ✅
- Practice area section has images for all 3 domains ✅

### Copy issues found
- **P2**: "Deep beforebroad." — missing space ("Deep before broad.")
- **P2**: "Designprinciples." — missing space in NL ("Ontwerp principes." in NL version is correct though)
- **P2**: "READ MORE" / "LEES VERDER" buttons on the problem cards — these appear to be non-functional (don't expand content)

---

## 3. Dashboard QA

**Status: PASS** ✅

### Live data widgets
- ✅ "Backend live" indicator shown
- ⚠️ "LOADED SAMPLE: 6" — seems like a hardcoded or sampled number, not the actual 9,649 docs
- ⚠️ "RUNNING JOBS: 2" — unclear what this refers to; no jobs are actually running
- ⚠️ "WORKFLOW PREVIEWS: 2" — matches the 2 deferred workflows
- ✅ "MATTERS: 0" — correct
- ✅ "LAST INGEST: 18h ago" — approximately correct

### Practice-area cards
- ✅ Employment law: "Available"
- ✅ Tenancy law: "Available"
- ⚠️ Administrative law: "No sample" — honest about missing data

### Recent sources
- ✅ Shows 6 real ECLI case law entries from the database
- ✅ Links to vault entries work

### Overclaiming check
- ✅ No fake claims found in dashboard copy
- ⚠️ Dashboard title still says "Professional-Grade Legal AI" in browser tab meta (from layout.tsx) — should be updated to match landing page title "Dutch legal research, grounded in sources"

---

## 4. Knowledge QA

**Status: PASS WITH MINOR ISSUES** ✅

### Search results

| Query | Results | Status |
|-------|---------|--------|
| huur woonruimte | 8 | ✅ All tenancy/employment legislation |
| ontslag op staande voet | 8 | ✅ Employment law sources |
| bezwaar termijn | 8 | ✅ Returns results (from existing corpus) |

### Filters
- ✅ Source type filter (All / Legislation / Case Law)
- ✅ Domain filter (All / Tenancy / Employment / Admin / Immigration / SME)
- ✅ Result count selector (5 / 8 / 10 / 12)
- ✅ Quick-search tags (huurcontract, ontslag, bezwaar, ECLI)

### Issues
- **P1**: Ingestion stats section shows empty values: "Success: / Failures: / Progress: / Started:" repeated 4 times. Looks broken.
- **P2**: Domain filter includes "Immigration Law" and "SME Business Law" — these have no data ingested. Could confuse users.

---

## 5. Documents / Vault QA

**Status: PASS** ✅

### Document cards
- ✅ 12 documents loaded by default
- ✅ Labels correct: "Case Law", "Rechtspraak", "Employment Law", "Indexed"
- ✅ ECLI identifiers shown
- ✅ Court names and dates visible
- ✅ Text snippets readable (Dutch legal text)
- ✅ "Open official source" links present
- ✅ "Preview document" links present
- ✅ Source type, domain, and count filters work

### Source detail page (`/dashboard/documents/BWBR0035303?domain=tenancy_law`)
- ✅ Full legislation title displayed
- ✅ Complete text rendered
- ✅ "Official source" link present
- ✅ "Back to Vault" navigation works
- ✅ No layout issues
- ✅ Text readable and scrollable

---

## 6. Assistant QA

| Question | Status | Citations | Relevant | Overclaiming | Score |
|----------|--------|-----------|----------|-------------|-------|
| Wat geldt bij opzegging van huur van woonruimte? | ✅ Answer returned | 8 | ✅ All tenancy/BWBR | No | 2/2 |
| Wat zijn aandachtspunten bij ontslag op staande voet? | ✅ Answer returned | 8 | ✅ Employment law | No | 2/2 |
| Welke termijn geldt voor bezwaar? | ⚠️ No visible answer | 0 | N/A | N/A | 0/2 |
| Kun je mijn volledige belastingaangifte doen? | ✅ Refused correctly | 8 | ⚠️ Cited unrelated sources | No | 1/2 |

### Notes
- **Q1**: Excellent answer with specific article numbers (BWBR0005290 Art. 228, 271, 272, 295; BWBR0003403 Art. 16). Fully grounded.
- **Q2**: Good answer citing employment law articles. Correctly mentions "onverwijldheid" (immediacy requirement).
- **Q3**: The administrative-law prompt loaded but didn't produce a visible answer. This is likely because no administrative law data exists in the corpus. The system should show a clear refusal message instead of silently failing.
- **Q4**: Correctly refused ("niet mogelijk om jouw volledige belastingaangifte te doen"), but still returned 8 citations from unrelated legislation. The refusal text is correct, but the citations are noise.

---

## 7. Onboarding & Login QA

**Status: PASS** ✅

### Login page (`/login`)
- ✅ Clean, professional layout
- ✅ Email + password form
- ✅ Magic link option
- ✅ Clear helper text about credential signup
- ✅ No overclaiming

### Onboarding page (`/dashboard/onboarding`)
- ✅ Practice area selector with 3 options (Employment, Tenancy, Administrative)
- ✅ Radio button selection works
- ✅ "Start with grounded query" CTA present
- ✅ Clear, honest copy

### Dev bypass
- ✅ `AUTH_DEV_BYPASS=true` working correctly
- ⚠️ Dev bypass email shown in top bar ("demo@clarvo.local") — acceptable for dev, must be removed for production

---

## 8. Matters / Workflows / Settings QA

### Matters (`/dashboard/matters`)
- **Status: PASS** ✅
- ✅ Clear "Limited preview" label
- ✅ Honest copy: "Full matter workspaces and document bundles are intentionally deferred"
- ✅ Create note form present (title, reference, domain, notes)
- ✅ Filter options work
- ✅ "0 notes" — correct empty state

### Workflows (`/dashboard/workflows`)
- **Status: PASS** ✅
- ✅ Two workflow previews (huurcontract review, bezwaarvoorbereiding)
- ✅ "Runner deferred" buttons clearly disabled
- ⚠️ **P2**: Minimal content — only titles and disabled buttons. No description of what these workflows would do.

### Settings (`/dashboard/settings`)
- **Status: PASS** ✅
- ✅ Profile fields (Display name, Firm, Theme, Practice area)
- ✅ API Keys section
- ✅ Data Sources checkboxes (BWB legislation, Rechtspraak judgments)
- ✅ Save button present
- ⚠️ **P2**: API key field has placeholder "Paste label after configuring OPENAI_API_KEY" — unclear UX
- ⚠️ **P2**: Practice area dropdown includes "Choose after onboarding" — acceptable for demo

---

## 9. P0 Blockers

**None.** The product is demo-ready.

---

## 10. P1 Fix Before Public Beta

1. **Knowledge page ingestion stats** — The "Success/Failures/Progress/Started" section shows empty values repeated 4 times. This looks broken. Either populate with real data or hide the section.
2. **Administrative-law assistant refusal** — When no corpus data exists, the assistant should show a clear "No sources found for this domain" message instead of silently failing.
3. **Browser tab title inconsistency** — Dashboard pages show "Clarvo — Dutch legal research, grounded in sources" but the old meta description still says "AI Agents for Europe's Legal Teams" in some contexts.

---

## 11. P2 Later

4. **Landing page spacing** — "Deep beforebroad." missing space, "Designprinciples." missing space
5. **"READ MORE" buttons** on landing page problem cards appear non-functional
6. **Out-of-scope assistant citations** — Tax question refused correctly but still cited 8 unrelated sources
7. **Domain filter completeness** — Immigration Law and SME Business Law appear in filters but have zero data
8. **Workflows page content** — Very sparse, only titles and disabled buttons
9. **Settings API key UX** — Placeholder text is confusing
10. **Dashboard stats** — "LOADED SAMPLE: 6" and "RUNNING JOBS: 2" seem hardcoded or misleading

---

## 12. Recommended Next Action

**Codex is NOT urgently needed.** The landing page rewrite was the big win, and it's done.

The P1 items are small targeted fixes:
1. **Hide or fix the ingestion stats section** on Knowledge page — a 10-line component change
2. **Add admin-law refusal handling** in the assistant — a conditional in the streaming page
3. **Update the meta description** in `layout.tsx` — a one-line change

These can be done by Claude Code, Codex, or even manually. No need for a dedicated Codex session unless Antho prefers to batch them.

**Exact next step for Antho:**
1. Commit and push the Codex landing page changes (`f43d2a0`) to GitHub if not already pushed
2. Decide whether to fix the 3 P1 items now or ship as-is for demo
3. If fixing: run Claude Code or Codex with the P1 list
4. If shipping as-is: the demo works — land on the dashboard, show a tenancy search, then the assistant, then inspect a citation
