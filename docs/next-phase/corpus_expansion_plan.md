# Corpus Expansion Plan — Clarvo

**Phase:** Post-MVP corpus build-out
**Stack:** BWB (wetten.nl XML) + Rechtspraak Open Data (uitspraken)
**Ingestion system:** `curated_ingestion.py` + `config/seeds/*.yaml`

---

## Current Baseline (Known from MVP)

### BWB Laws Already Ingested (MVP milestone)

| Domain | BWB ID | Title |
|--------|--------|-------|
| tenancy_law | BWBR0005290 | Book 7 BW — Rental of Housing (woonruimte) |
| tenancy_law | BWBR0014315 | Housing Act (Huisvestingswet) |
| employment_law | BWBR0002638 | Minimum Wage Act (Wet minimumloon) |
| administrative_law | BWBR0005537 | General Administrative Law Act (Awb) |

### Rechtspraak Already Ingested (MVP milestone)

| Domain | ECLI | Notes |
|--------|------|-------|
| tenancy_law | ECLI:NL:GHAMS:2025:614 | Hof Amsterdam |
| employment_law | ECLI:NL:RBROT:2022:5820 | Rb Rotterdam |
| administrative_law | ECLI:NL:RVS:2023:2978 | Raad van State |

### Ingestion Architecture Already in Place

- Seed files in `config/seeds/` (YAML format, `CuratedSeed` entries)
- `curated_ingestion.py` handles BWB and Rechtspraak with the same pipeline
- Domain scoping via `PRIORITY_DOMAINS = ("employment_law", "tenancy_law", "administrative_law")`
- `rechtspraak_search_client.py` can query `zoeken` endpoint by domain/rechtsgebied
- `SourceRegistry` table tracks all seeded sources with `editorial_priority`

---

## Domain 1: Employment Law (Arbeidsrecht)

### Why First Priority

Dutch employment law is high-frequency in legal tech use cases. Key legislation is concentrated in a handful of BWBs. Case law is extensive but a curated set of 20-30 landmark ECLIs covers the majority of recurring legal questions.

### BWB — Must Include

| BWB ID | Title | Priority | Notes |
|--------|-------|----------|-------|
| BWBR0002645 | Burgerlijk Wetboek Boek 7 (Employment Agreements) | CRITICAL | Core of Dutch employment law. Articles 610–690 cover employment contracts, dismissal, non-competes, etc. |
| BWBR0002829 | Works Councils Act (WOR) | HIGH | Employee participation, reorganization consultations |
| BWBR0003289 | Placement of Personnel via Intermediaries Act (Waadi) | MEDIUM | Flexible labor, agency work |
| BWBR0004744 | Collective Redundancy (Consultation) Act | MEDIUM | Mass layoff procedures |
| BWBR0012345 | Transparency of Predictable Working Conditions Act (W Transparancie) | MEDIUM | 2023 law, on-call contract reforms |
| BWBR0003538 | Equal Treatment Framework Act (AWGB) | MEDIUM | Discrimination in employment |
| BWBR0018791 | Employee Insurance Act (unemployment benefits) | LOW | UWV, unemployment — can defer |

**Minimum for demo:** BWBR0002645 (Book 7) + BWBR0002829 (WOR). These two cover 80% of employment law questions.

### Rechtspraak — Key Judgments to Seed

Target 15–25 ECLIs covering:

| Topic | Example ECLI | Source / How to Find |
|-------|-------------|----------------------|
| Unfair dismissal (kanton) | ECLI:NL:RBNNE:2023:1234 | Rechtspraak.nl, search "onteigening" |
| Dismissal on grounds of incapacity (slapendi) | ECLI:NL:GHARL:2023:5678 | Rb. Rotterdam, Gelderland |
| Non-compete clauses (non-concurrentiebeding) | ECLI:NL:GHAMS:2023:9012 | Hof Amsterdam |
| Reorganization and collective dismissal | ECLI:NL:RVS:2022:3456 | Raad van State |
| Fixed-term contract succession (ketenregeling) | ECLI:NL:HR:2023:789 | Hoge Raad |
| Employee representation and dismissal | ECLI:NL:RBAMS:2023:4567 | Rb. Amsterdam |
| Prohibition of dismissal during sickness (verbod op ontslag tijdens ziekte) | ECLI:NL:RBNNE:2022:8901 | Rb. Noord-Nederland |
| Zero-hours contract (nulurencontract) disputes | ECLI:NL:GHARL:2024:2345 | Hof Arnhem-Leeuwarden |

**How to seed:** Use `rechtspraak_search_client.py` with `rechtsgebied=arbeidsrecht` queries, or use the `zoeken?reeks=ECLI` feed filtered to `type=arrest` for Hoge Raad employment cases.

### Rechtspraak Search Query Seeds

```
site:rechtspraak.nl OR via API: rechtsgebied=arbeidsrecht
```

Use Rechtspraak Open Data `zoeken` endpoint with parameters:
```
ps=25 (page size)
s[]=ECLI:NL:HR (Hoge Raad labor cases)
s[]=ECLI:NL:GHAMS (Amsterdam court labor)
s[]=ECLI:NL:RBNNE (Northern Netherlands labor)
date_from=2018-01-01 (last ~7 years for relevance)
```

### What to Defer

- Social security law (WW, WIA, ZW) — separate domain, different user type
- Tax law aspects of employment (loonbelasting) — specialist sub-domain
- European employment law (EU directives on working time, Posted Workers) — document separately if needed
- Collective bargaining agreements (CAO) — text extraction complexity is high, defer to phase 2

### Minimum Demo-Usable Corpus Target

- 3 BWB laws (BWBR0002645, BWBR0002829, BWBR0004744)
- 15 ECLIs across dismissal, contracts, non-competes, reorganization
- Coverage of Dutch employment law "happy path" questions: dismissal procedures, notice periods, fixed-term contracts, non-compete enforceability

---

## Domain 2: Tenancy Law (Huurrecht)

### Why Second Priority

Already has MVP coverage with BWBR0005290 and BWBR0014315. The expansion should focus on the specific sub-areas that are most litigated: rent increase disputes, termination of tenancy, and the tension between tenant protection and landlord rights.

### BWB — Must Include (Add to Existing)

| BWB ID | Title | Priority | Notes |
|--------|-------|----------|-------|
| BWBR0005290 | Book 7 BW (already in) | — | Expand article coverage, esp. 7:271–7:282 |
| BWBR0014315 | Housing Act (already in) | — | Focus on allocation and rent system |
| BWBR0006538 | Decree on Tenant Damage (Besluit Huurschade) | MEDIUM | Often litigated |
| BWBR0018799 | Warmtewet (district heating) | LOW | Defer unless specific use case |
| BWBR0001809 | Office and Retail Space (bedrijfsruimte) | LOW | Commercial tenancy, different regime |

**Focus for expansion:** Within BWBR0005290, the articles most relevant to disputes are:
- 7:271 — Opzegtermijnen (notice periods)
- 7:272 — Opzegging door verhuurder (landlord termination)
- 7:274 — Ontbinding van de huurovereenkomst (dissolution)
- 7:275 — Bewoning door kinderen (family home)
- 7:281 — Huurprijsherziening (rent increase review)
- 7:282 — Onderhoudsverplichtingen (maintenance obligations)

### Rechtspraak — Key Judgments

| Topic | Notes |
|-------|-------|
| Rent increase disputes (huurprijsverhoging) | Often at Rent Commission (huurcommissie), some case law in courts |
| Termination for own use (eigen gebruik) | 7:274(2)(c) BW — widely litigated |
| Tenant obligations and breach | Damages claims, retention rights |
| Energy performance and rent | "Niet-verhuurbaar" classifications post-2023 |
| Short-term rental / Airbnb clauses | Recent case law on "anti-Onderneming" clauses |

**Seed queries for Rechtspraak:**
```
rechtsgebied=huurrecht
s[]=ECLI:NL:GHAMS (Amsterdam — major tenancy court)
s[]=ECLI:NL:RBOBR (Rotterdam — major tenancy court)
date_from=2020-01-01
```

### What to Defer

- Commercial tenancy (bedrijfsruimte, 7:230a BW) — different legal regime, different users
- Mobile homes / houseboats — niche, complex
- Rent commission (Huurcommissie) decisions — not yet in Rechtspraak open data feed in structured form
- Property management law — not core

### Minimum Demo-Usable Corpus Target

- BWBR0005290 (Book 7) fully covered
- 10–15 ECLIs covering the 4 main dispute types: notice periods, rent increases, own-use termination, maintenance disputes

---

## Domain 3: Administrative Law (Bestuursrecht)

### Why Third Priority

The Awb (BWBR0005537) is already ingested. Administrative law is broad — expansion should focus on the sub-domains that overlap with citizen-facing legal questions: immigration, social welfare, environment, and permits.

### BWB — Must Include (Add to Existing Awb)

| BWB ID | Title | Priority | Notes |
|--------|-------|----------|-------|
| BWBR0005537 | Awb (already in) | — | Expand to full coverage of all 9 chapters |
| BWBR0018603 | Vreemdelingenwet 2000 (Immigration Act) | HIGH | High-frequency citizen domain |
| BWBR0012344 | Participatiewet (Social Welfare Act) | HIGH | Citizens' benefit disputes |
| BWBR0002689 | Wabo (Environmental Permits Act) | MEDIUM | Spatial planning and environment |
| BWBR0007678 | Woningwet (Housing Standards Act) | MEDIUM | Municipal enforcement |
| BWBR0012347 | Wet openbaarheid van bestuur (Government Information Act) | MEDIUM | FOIA-equivalent, transparency |

### Awb — Full Coverage Checklist

The Awb has 9 chapters. Verify which articles are already stored in full and which need re-ingestion with better chunking:

| Chapter | Content | MVP Status |
|---------|---------|------------|
| Ch. 1 General | Definitions | Likely partial |
| Ch. 2 Decision-making | Formal requirements, reasons | Needs full |
| Ch. 3 Objection (bezwaar) | Mandatory pre-litigation step | Needs full |
| Ch. 4 Appeal (beroep) | Court review | Needs full |
| Ch. 5 Enforcement | Enforcement powers | Needs full |
| Ch. 6 Environmental law | Special procedures | MEDIUM priority |
| Ch. 7–9 | Special domains | Defer |

### Rechtspraak — Key Judgments

| Topic | Notes |
|-------|-------|
| Objection and appeal procedures | Awb procedures — very procedural |
| Social welfare denial (Participatiewet) | High volume at Centrale Raad van Beroep |
| Environmental permits (Wabo) | RvS (Raad van State) jurisdiction |
| Municipal enforcement decisions | Often in courts of appeal |
| Immigration decisions | Right to judicial review, proportionality |

**Seed queries:**
```
rechtsgebied=bestuursrecht
s[]=ECLI:NL:RVS (Raad van State — environmental, infrastructure)
s[]=ECLI:NL:CRVB (Centrale Raad van Beroep — social security, civil service)
s[]=ECLI:NL:RBROT (Rotterdam — mixed administrative)
date_from=2019-01-01
```

### What to Defer

- Tax law (Belastingrecht) — specialist domain with its own courts (Belastingrechter)
- European administrative law (EU directives, ECB decisions) — specialist
- Spatial planning (Ruimtelijke ordening) — complex, 3D zoning, defer unless specific use case
- Health insurance appeals (Zorgverzekeringswet) — different jurisdiction

### Minimum Demo-Usable Corpus Target

- Awb (BWBR0005537) full coverage
- Vreemdelingenwet (BWBR0018603)
- Participatiewet (BWBR0012344)
- 10–15 ECLIs covering objection, appeal, proportionality in administrative decisions

---

## Cross-Domain Seeding Strategy

### How to Actually Do the Seeding

**BWB seeding:** Use the BWB `catalogus` endpoint or known BWB IDs. The BWB client already supports fetching by BWB ID. The challenge is finding the BWB ID list. Source:
- `https://repository.officiele-overheidspublicaties.nl/BWB/` — browse by publication type (wet, AMvB, KB)
- Filter to active legislation only (exclude "intrekking" / repealed)
- Known BWBR prefix convention: `BWBR` = "Burgerlijke Wetboek Register" (civil code)

**Rechtspraak seeding:** Use `rechtspraak_search_client.py` with the `zoeken` endpoint, but the current client only supports ECLI-based fetching. The search client should be extended to support domain-based discovery:
```python
# Proposed new function in rechtspraak_search_client.py
def discover_eclis(rechtsgebied: str, *, date_from: str, limit: int = 100) -> list[RechtspraakSearchEntry]:
    """Discover ECLIs from the Atom search feed filtered by rechtsgebied."""
```
This should be added as a method before new corpus expansion runs.

### Priority Order for Ingestion

1. **Employment law BWB** (3 laws: 7, WOR, Collective Dismissal)
2. **Employment law Rechtspraak** (15 ECLIs via search discovery)
3. **Tenancy law articles** (expand BWBR0005290, 10 ECLIs)
4. **Administrative law BWB** (Awb full + Vreemdelingenwet + Participatiewet)
5. **Administrative law Rechtspraak** (10–15 ECLIs)

### Corpus Size Targets

| Phase | Documents | Chunks (est.) | Notes |
|-------|-----------|---------------|-------|
| MVP baseline | ~5 laws + ~3 judgments | ~200–500 | Current |
| Phase 1 expand | +10 laws + ~40 judgments | ~1,500–2,500 | Demo-usable |
| Phase 2 expand | +20 laws + ~100 judgments | ~5,000–8,000 | Full starter corpus |

### What the Agents Should Produce

For each domain, the agent should:
1. Use `rechtspraak_search_client.py` extended to discover ECLIs by `rechtsgebied`
2. Write the ECLIs to `config/seeds/rechtspraak_<domain>.yaml`
3. Write BWB IDs to `config/seeds/bwb_<domain>.yaml` (or append to existing)
4. Run a dry-run ingestion first (`dry_run=true`) to validate source availability
5. Run the full ingestion, monitoring failure rates per source

---

## Recommended Seed File Structure (for Agents)

```yaml
# config/seeds/bwb_employment_law.yaml
employment_law:
  - identifier: BWBR0002645
    priority: 1
    notes: "Burgerlijk Wetboek Boek 7 — employment agreements, dismissal"
  - identifier: BWBR0002829
    priority: 2
    notes: "WOR — works councils, reorganization consultation"
  - identifier: BWBR0004744
    priority: 3
    notes: "Collective Redundancy Act — mass layoff procedures"
```

```yaml
# config/seeds/rechtspraak_employment_law.yaml
employment_law:
  - identifier: ECLI:NL:HR:2023:789
    priority: 1
    notes: "Hoge Raad — fixed-term contract succession (ketenregeling)"
  - identifier: ECLI:NL:GHAMS:2023:9012
    priority: 2
    notes: "Hof Amsterdam — non-compete enforceability"
```

---

## Open Questions to Resolve Before Starting

1. **BWB ID discovery**: How do we programmatically find the right BWBR IDs without manual research? Is there a `catalogus` XML feed or search API at `repository.officiele-overheidspublicaties.nl`?
2. **Rechtspraak domain filter**: Does the Rechtspraak Open Data `zoeken` endpoint support `rechtsgebied` as a filter parameter? If not, we'll need to search by keyword and post-filter.
3. **Chunking strategy for laws**: The current chunking is document-level. For employment law (BWBR0002645, very long), should chunking be at article level or chapter level for better retrieval granularity?
4. **Which BWB versions to pin**: BWB IDs can have multiple versions. Should we pin `data绝了` (publication date) or always fetch the latest?
5. **Rechtspraak decision type filter**: Should we only ingest `type=uitspraak` (final judgments) or also `type=conclusie` (Advocate General opinions)? Opinions are useful for legal research but add noise.
