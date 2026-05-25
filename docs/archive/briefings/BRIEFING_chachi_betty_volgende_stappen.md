# Clarvo — Volgende Stappen Briefing
**Voor:** Chachi Batty
**Van:** Antho + Hermes Agent
**Datum:** 21 april 2026
**Status:** Post-MVP, klaar voor volgende fase

---

## Waar staan we nu

Clarvo heeft een werkend MVP met:
- Ingestie van echte Nederlandse wetgeving (BWB/wetten.nl)
- Ingestie van echte rechtspraak (Rechtspraak Open Data)
- Async jobs met tracking
- Hybride retrieval (BM25 + vector search)
- Grounded assistant die alleen citeert uit opgeslagen bronnen
- Auth + onboarding
- Premium frontend

**De MVP code is klaar.** De volgende fase is geen UI-werk. Het is: corpus bouwen, eval systeem, en operaties.

---

## De 6 Onderzoeksdocumenten (volledig uitgewerkt)

Alle details staan in de `docs/` folder van de repo. Dit is de samenvatting per document:

---

### 1. Corpus Expansie Plan — `docs/corpus_expansion_plan.md`

**Wat we hebben (MVP):**
- 4 wetten + 3 uitspraken — extreem dun voor demo-gebruik

**Wat we moeten toevoegen, per rechtsgebied:**

**Arbeidsrecht (prioriteit 1):**
- BWBR0002645 (Boek 7 BW — arbeidsovereenkomst, ontslag)
- BWBR0002829 (WOR — ondernemingsraad, reorganisatie)
- BWBR0004744 (Collectief ontslag)
- 15-25 ECLIs: ontslag op staande voet, ketenregeling, non-concurrentiebeding, ziekte

**Huurrecht (prioriteit 2):**
- BWBR0005290 uitbreiden met artikelen 7:271–7:282
- BWBR0014315 (Huisvestingswet)
- 10-15 ECLIs: opzegging, huurprijsverhoging, eigen gebruik

**Bestuursrecht (prioriteit 3):**
- BWBR0005537 (Awb) — volledige dekking hoofdstuk 2-5
- BWBR0018603 (Vw 2000 — immigratie)
- BWBR0012344 (Participatiewet — bijstand)
- 10-15 ECLIs: bezwaar, beroep, proportionaliteit

**Demo-doel:** ~10 wetten + ~40 uitspraken = corpus waarmee je echt series vragen kunt beantwoorden.

---

### 2. Embedding & Storage Strategie — `docs/embedding_storage_strategy.md`

**Kritische bevinding:** Er is NU geen vector index op de `embedding` kolom. Elke vector search is een brute-force scan. Dit is de #1 prioriteit om te fixen.

**Aanbeveling:**
1. **Nu:** HNSW index bouwen (1 regel SQL migration)
2. **Nu:** Supabase voor managed Postgres — swap `DATABASE_URL`, geen code-wijzigingen nodig
3. **Niet nu:** Pinecone / Qdrant / dedicated vector DB — pas bij >2M chunks

Supabase is geen aparte vector database — het is gewoon managed Postgres met pgvector. De hele migratie is: connection string vervangen.

---

### 3. Supabase Skill Plan — `docs/supabase_skill_plan.md`

Hoe een agent Supabase moet opzetten en migreren:
- Environment variables (`DATABASE_URL`, `SUPABASE_URL`, etc.)
- Welke tables/indexes al bestaan (allemaal via SQLAlchemy, geen nieuwe tabellen nodig)
- Migratie stappen: dump → load → verify → switch
- Belangrijk: PgBouncer port (6543) vs direct port (5432) voor migrations

---

### 4. Eval & Citation Audit Plan — `docs/eval_and_citation_audit_plan.md`

** Retrieval evaluatie:**
- Nu: 6 testvragen — veel te weinig
- Doel: 20+ vragen per rechtsgebied
- Metrics: nDCG@10 > 0.75, Recall@10 > 0.80, Precision@10 > 0.60

** Citation kwaliteit — het echte probleem:**
- Retrieval kwaliteit = hebben we het juiste document gevonden?
- Citation kwaliteit = citeert de assistant correct uit het gevonden document?
- Een slechte citation kan: hallucineren (wet niet ondersteunt het), verkeerd artikel, of materiaal weglaten

**Audit systeem:**
- Automatisch: text-overlap check tussen antwoord en bron — als overlap < 0.3, hold voor human review
- Wekelijks: 10% steekproef human review
- Alles logged in `citation_audit_log` tabel

**Metrics die er toe doen:**
| Metric | Doel |
|--------|------|
| nDCG@10 | > 0.75 |
| Recall@10 | > 0.80 |
| Citation support rate | > 95% |
| Hallucination rate | < 2% |
| Appropriate refusal rate | > 90% |

---

### 5. Agent Operating Model — `docs/agent_operating_model_next_phase.md`

Hoe de agenten als team werken:

| Agent | Rol | Doet |
|-------|-----|------|
| **Hermes** (dit) | Senior partner, orchestrator | Coördineert, eskaleert naar mens, triggert evals |
| **Codex** | Associate developer | Implementeert features, schrijft migrations, fixeert bugs |
| **OpenClaw** | Junior / execution | Leve citation check, retrieval gate |
| **Gemini** | Paralegal | Onderzoek, ECLI discovery, data gathering |
| **Mens (Antho)** | Partner | Strategie, legal accuracy, goedkeuring |

**Belangrijk:** Elk agent heeft een duidelijke "doet NIET" lijst. Codex raakt geen ground truth. Gemini raakt geen code. Mens moet goedkeuren: Supabase migratie, embedding model wijziging, nieuwe domeinen.

---

### 6. Open Vragen — `docs/open_questions_next_phase.md`

15 openstaande beslissingen die verdere actie blokkeren. Top 5:

1. **P0 — Ground truth annotatie:** Wie maakt de eval vraag-antwoord paren? Dit moet een mens zijn (Nederlands recht kennis nodig). Kan niet door agenten.
2. **P0 — Hosting keuze:** Supabase vs self-hosted Postgres? Strategische beslissing.
3. **P1 — BWB ID ontdekking:** Hoe vinden we programmatically de juiste BWBR IDs per rechtsgebied?
4. **P1 — Eval thresholds:** Wat is het minimum acceptabele nDCG@10 voor go/no-go?
5. **P2 — Agent state sharing:** Hoe delen Codex/Gemini/Hermes informatie veilig?

---

## Concrete Volgende Stappen (prioriteitsvolgorde)

### Stap 1 — NUCLEUS: Fix de missing vector index
- Codex schrijft HNSW migration (`m=16, ef_construction=64`)
- Run de migration
- Meet verbetering in retrieval latency
- **Status:** Dit is 1 file, 1 uur werk, hoogste impact

### Stap 2 — OPS: Migreer naar Supabase
- Antho maakt Supabase project
- Dump huidige data → load naar Supabase
- Swap `DATABASE_URL`
- Verifieer document count klopt
- Run evals op nieuwe setup
- **Status:** 1 dag werk, elimineert alle Postgres ops overhead

### Stap 3 — CORPUS: Employment law als demo-domein
- Gemini: ontdek ECLIs voor arbeidsrecht via Rechtspraak Open Data feed
- Hermes: schrijf seed files (`config/seeds/bwb_employment.yaml`)
- Codex: run dry-run → Antho approves → full ingestie
- Codex: run embedding backfill
- Hermes: run evals, rapporteer nDCG@10 / Recall@10

### Stap 4 — EVAL: Bouw het evaluatie systeem
- Antho: maak ground truth annotaties (20+ vragen arbeidsrecht)
- Codex: implementeer hallucination detection script
- Codex: voeg `citation_audit_log` tabel toe
- Hermes: stel cron job in voor wekelijkse evals
- **Status:** Blijvende investering — dit wordt de kwaliteits基准

### Stap 5 — UITBREIDING: Huurrecht + Bestuursrecht
- Herhaal Stap 3 voor huurrecht
- Herhaal Stap 3 voor bestuursrecht
- Prioriteit: huurrecht eerst (al deels in MVP), bestuursrecht derde

---

## Wat Chachi Batty moet weten

1. **De code is klaar.** Er is geen grote refactor nodig. Het framework werkt.

2. **De volgende fase is corpus + kwaliteit, niet features.** We bouwen geen nieuwe UI. We bouwen juridische kennis.

3. **Citation kwaliteit is het belangrijkste product-probleem.** Retrieve is Commodity. Correct citeren is het product. Daar moet de meeste energie naartoe.

4. **De agenten zijn het team.** Dit is een multi-agent workflow. Chachi moet weten wie wat doet (zie Agent Operating Model).

5. **De 6 documenten in `docs/` zijn allemaal volledig uitgewerkt.** Er staat precies in wat agents moeten doen, met concrete commands, SQL, seed formats, en tijdlijnen.

6. **De eerstvolgende beslissing die genomen moet worden:** Supabase migratie goedkeuren (JA of NEE). Daarna kunnen agents direct aan het werk.

---

## Waar sturen we het naartoe?

Zeg waar je dit naartoe wilt sturen — e-mail, een shared folder, een notitie in Chachi's tool, of iets anders — en ik lever het in dat formaat.
