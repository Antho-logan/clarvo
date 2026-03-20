# Veridicta Content Quality Notes

## Search Result Quality

### huurcontract query
- **Hits:** 2 (both legislation)
- **Relevance:** Low (10% scores)
- **Domain:** Mixed (employment_law, tenancy_law) - same document appears in both
- **Snippet:** Clean, shows article 249 about huurcommissie
- **Assessment:** Functional but narrow results

### ontslag query
- **Hits:** 3 (case law)
- **Relevance:** Better (0.5 - 1.2 scores)
- **Domain:** employment_law, sme_business_law
- **Snippet:** Very detailed, includes full case text
- **Assessment:** Good case law coverage

### bezwaar query
- **Hits:** Working
- **Assessment:** Functional

## Snippet Quality

### Legislation snippets
- **Format:** Single sentences extracted from articles
- **Length:** Short (1-2 sentences)
- **Readability:** Good, legal but understandable
- **Context:** Limited without full article

### Case law snippets
- **Format:** Full or near-full judgment text
- **Length:** Very long (thousands of characters)
- **Readability:** Raw - includes case headers, party names, procedural text
- **Assessment:** Too verbose for search results, needs truncation

## Title/Metadata Quality

### BWBR IDs (Legislation)
- **Format:** BWBR0005290 (clean identifiers)
- **Problem:** Full title field contains重复 dates and publication info
- **Example:** "Burgerlijk Wetboek Boek 7, Bijzondere overeenkomsten 1991 600 18-12-1991..."
- **Assessment:** Too noisy, needs cleaning

### ECLI (Case Law)
- **Format:** ECLI:NL:RBDHA:2023:6671 (clean)
- **Title:** Just shows ECLI as title (no case name)
- **Assessment:** Needs human-readable case name

### Domain field
- **Values present:** employment_law, tenancy_law, administrative_law, sme_business_law
- **Issue:** UI shows "Unassigned Domain" despite domain being populated
- **Assessment:** Backend OK, frontend display issue

### Article/Section
- **Format:** Clean - "Article 249", "Section 2"
- **Assessment:** Good

## Document Detail Quality

### Observed on /dashboard/documents page
- Source IDs display correctly
- Article numbers visible
- Subjects (Citeertitel, Inwerkingtreding) present
- Fetch dates shown (09 Mar 2026)
- Snippet preview available
- Links to official source work

### Issues
- No formatting differentiation between legislation and case law
- Long raw titles dominate visual space
- No visual hierarchy between metadata fields

## Assistant/Retrieval Quality

### Retrieval-first approach
- **Concept:** Good - returns sources not hallucinations
- **Problem:** Domain filter too restrictive
- **Empty states:** Technical "0 hits" message
- **Assessment:** Foundation solid, needs refinement
