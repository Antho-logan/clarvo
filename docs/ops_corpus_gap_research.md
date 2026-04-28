# Corpus Gap Research — Phase 7

**Date:** 2026-04-27
**Status:** Complete

## Current Corpus

| source_type | domain | count | % of total |
|-------------|--------|-------|------------|
| legislation | employment_law | 5,893 | 61.1% |
| legislation | tenancy_law | 3,706 | 38.4% |
| case_law | employment_law | 50 | 0.5% |
| **TOTAL** | | **9,649** | |

## Seed Config Coverage

The `config/seed_bwbr_ids.json` defines **5 domains** with **15 BWB IDs**:

| Domain | BWB IDs | Legislation | Case Law | Status |
|--------|---------|-------------|----------|--------|
| tenancy_law | BWBR0005290, BWBR0014315, BWBR0009810 | ✅ 3,706 | ❌ 0 | **PARTIAL** — no case law |
| employment_law | BWBR0005290, BWBR0002638, BWBR0013008 | ✅ 5,893 | ✅ 50 | **GOOD** |
| administrative_law | BWBR0005537, BWBR0045754, BWBR0018472 | ❌ 0 | ❌ 0 | **MISSING** |
| immigration_law | BWBR0011823, BWBR0011825, BWBR0003738 | ❌ 0 | ❌ 0 | **MISSING** |
| sme_business_law | BWBR0003045, BWBR0021777, BWBR0001860 | ❌ 0 | ❌ 0 | **MISSING** |

## Key BWB IDs Explained

| BWB ID | Short Title | Domain |
|--------|------------|--------|
| BWBR0005290 | Burgerlijk Wetboek (Civil Code) | Shared: tenancy + employment |
| BWBR0014315 | Huurwet (not in BWBR DB?) | tenancy_law |
| BWBR0009810 | Wet op de huurtoeslag (Rent Allowance Act) | tenancy_law |
| BWBR0002638 | Ontslagregeling (Dismissal Regulations) | employment_law |
| BWBR0013008 | Arbeidsomstandighedenwet (Working Conditions Act) | employment_law |
| BWBR0005537 | Algemene wet bestuursrecht (Awb — General Admin Law) | administrative_law |
| BWBR0045754 | Uniforme openbare voorbereidingsprocedure | administrative_law |
| BWBR0018472 | Wet dwangsom en beroep bij niet-tijdig beslissen | administrative_law |
| BWBR0011823 | Vreemdelingenwet 2000 (Immigration Act) | immigration_law |
| BWBR0011825 | Vreemdelingenwet (older) | immigration_law |
| BWBR0003738 | Wet arbeid vreemdelingen (Foreign Workers Act) | immigration_law |
| BWBR0003045 | Handelsregisterwet (Commercial Register Act) | sme_business_law |
| BWBR0021777 | Wet op de ondernemingskamers | sme_business_law |
| BWBR0001860 | Faillissementswet (Bankruptcy Act) | sme_business_law |

## Case Law Seeds

`config/seed_eclis.json` defines ECLI IDs per domain:
- employment_law: **210 cases**
- tenancy_law: **219 cases**
- administrative_law: **267 cases**
- immigration_law: **226 cases**
- sme_business_law: **206 cases**
- **Total:** **1,128 cases**

Only 50 employment_law cases were ingested.

## Gaps Identified

### Gap 1: Missing Domains (Critical)
3 of 5 domains have **zero** documents:
- **administrative_law** — 0/3 legislation + 0/267 cases
- **immigration_law** — 0/3 legislation + 0/226 cases  
- **sme_business_law** — 0/3 legislation + 0/206 cases

**Root Cause:** Ingestion script only ran for tenancy_law and employment_law. The `make ingest-curated` target may have domain filters or the script ran partially.

**Fix:** Re-run ingestion with full seed config, or run per-missing domain.

### Gap 2: Missing Case Law (High)
- tenancy_law: 0/219 cases ingested
- administrative_law: 0/267 cases
- immigration_law: 0/226 cases
- sme_business_law: 0/206 cases
- employment_law: only 50/210 cases (160 missing)

**Fix:** Check ECLI ingestion pipeline — may need separate API calls to Rechtspraak.nl

### Gap 3: BWBR0014315 May Not Exist
The "Huurwet" (BWB ID BWBR0014315) may not be a valid standalone law on wetten.nl. It could be an old reference or incorrect ID. The 3,706 tenancy_law documents likely all come from BWBR0005290 (Burgerlijk Wetboek Boek 7).

**Fix:** Verify BWBR0014315 exists; if not, remove from seed config and replace with relevant tenancy BWB IDs.

### Gap 4: No Dutch BM25 Tokenization (Critical)
BM25 search returns 0 hits for Dutch legal queries. The PostgreSQL `plainto_tsquery` uses default (English) text search config, which cannot tokenize Dutch compound words like "opzegging", "servicekosten", "transitievergoeding".

**Fix:** Set `default_text_search_config = 'dutch'` in PostgreSQL, or use `to_tsquery('dutch', ...)` explicitly in `search.py`.

### Gap 5: No Vector Embeddings (Blocking)
9,649 documents with zero embeddings. All vector search and hybrid search is non-functional.

**Fix:** Enable embedding model on OpenAI project.

## Recommended Additional Sources (Post-MVP)

### Tenancy Law
- **Huurcommissie decisions** — thousands of binding rulings on rent disputes
- **Wet huurprijzen woonruimte** (WHW) — rent price regulation
- **Besluit huurprijzen** — rent price decree

### Employment Law
- **Wet flexibiliteit en zekerheid (Wfz)** — flexibility and security act
- **Wet werk en zekerheid (Wwz)** — work and security act  
- **CAO-bepalingen** — collective labor agreement provisions

### Administrative Law
- **Awb commentary** — Kamer/Heinemann annotations (not legislation, but critical for interpretation)
- **Awb Uitvoeringsregeling** — implementation regulations

## Action Items

| Priority | Action | Effort | Dependency |
|----------|--------|--------|------------|
| P0 | Enable embedding model on OpenAI | 5 min | User action |
| P0 | Re-run ingestion for missing 3 domains | 30 min | P0 above |
| P0 | Ingest missing case law (ECLI pipeline) | 1 hr | ECLI API access |
| P1 | Fix BM25 Dutch tokenization | 15 min | None |
| P2 | Verify BWBR0014315 validity | 10 min | None |
| P3 | Add Huurcommissie decisions (post-MVP) | 4 hr | Scraper needed |
