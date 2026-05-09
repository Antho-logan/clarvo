"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import styles from "./ApprovedStaticLanding.module.css";

type Locale = "en" | "nl";
type NavCopy = {
  product: string;
  practice: string;
  trust: string;
  beta: string;
  signIn: string;
  request: string;
};

const betaHref =
  "mailto:hello@veridicta.nl?subject=Veridicta%20beta%20access%20request";
const walkthroughHref =
  "mailto:hello@veridicta.nl?subject=Veridicta%20walkthrough%20request";
const emailHref = "mailto:hello@veridicta.nl";

const copy = {
  en: {
    nav: {
      product: "Product",
      practice: "Practice areas",
      trust: "Trust",
      beta: "Beta",
      signIn: "Sign in",
      request: "Request beta access",
    },
    hero: {
      beta: "Private beta · Invitation only",
      title: "Dutch legal research, grounded in sources.",
      subtitle:
        "Veridicta is a research assistant for Dutch legal professionals. Ask a question, get an answer backed by Dutch legislation and case law, and inspect every citation before you rely on it.",
      walkthrough: "Book a walkthrough",
      disclaimer:
        "Built for lawyers. Currently focused on employment and tenancy law, with administrative law expanding in beta. Veridicta supports research; it does not replace legal judgment.",
      query: "Wat geldt bij opzegging van huur van woonruimte?",
      badge: "Lawyer review required",
      answer:
        "For termination of residential tenancy, the assistant retrieves relevant Dutch legal sources and marks the answer for professional review.",
      trust: "Insufficient sources found for other grounds",
      sourceTitle: "Source passage",
      sourceLink: "Inspect source →",
      sourceBody:
        "The relevant passage is shown here in context so a lawyer can verify whether the citation supports the answer.",
      promise: "Every source can be opened and verified before you use the answer.",
    },
    problem: {
      eyebrow: "The research problem",
      title: "Legal research is slow because the sources are scattered.",
      lede:
        "Statutes live in one system, case law in another, internal memos in a third. Verifying a single answer means switching tabs, re-reading articles, and tracking down the exact passage that supports the conclusion. General-purpose AI tools speed up the writing but rarely show their work - and an answer without a source is a liability, not a shortcut.",
      strong:
        "Veridicta is built around the opposite assumption: the citation is the answer. The prose is just how you get there.",
      cards: [
        [
          "Fragmented sources",
          "Legislation, case law, and commentary sit in separate systems. Cross-checking one question takes longer than answering it.",
        ],
        [
          "Citation overhead",
          "Every claim needs a source. Reading, copying, and verifying passages is the slowest part of any memo.",
        ],
        [
          "Ungrounded AI is risky",
          "A confident paragraph without a citation is not research. It is a draft you still have to verify from scratch.",
        ],
      ],
    },
    product: {
      eyebrow: "What Veridicta does",
      title: "A research workflow built around verifiable sources.",
      lede: "Core capabilities available in the current private beta.",
      chipA: "Source inspection",
      chipB: "Source-backed answer",
      capabilities: [
        [
          "Search Dutch legal materials",
          "Search across ingested Dutch legislation and case law from a single interface. Results link to the underlying source, not a paraphrase.",
        ],
        [
          "Ask source-backed questions",
          "Pose a legal question in natural language. Veridicta returns an answer with citations to the materials it relied on. When the corpus does not support a confident answer, it says so instead of guessing.",
        ],
        [
          "Inspect every citation",
          "Open any citation to see the source passage in context. You decide whether the cited authority supports the answer.",
        ],
        [
          "Save research to a Matter",
          "Keep useful answers, questions, and citation metadata together in a workspace for later review.",
        ],
        [
          "Draft a research memo",
          "Turn a grounded saved note into a draft memo that preserves citations and remains clearly marked for lawyer review.",
        ],
        [
          "Use optional voice intake",
          "Dictate a Dutch research question in supported browsers, review the transcript, then submit it as a normal assistant query.",
        ],
      ],
    },
    practice: {
      eyebrow: "Current focus",
      title: "Deep before broad.",
      lede:
        "Veridicta is built one practice area at a time. We would rather be genuinely useful in two domains than shallow across ten.",
      areas: [
        [
          "Available",
          "Employment law",
          "Dutch employment legislation and case law, including dismissal, contracts, and working conditions.",
          "status-available",
        ],
        [
          "Available",
          "Tenancy law",
          "Residential and commercial tenancy questions, grounded in relevant Dutch legislation and case law.",
          "status-available",
        ],
        [
          "Expanding",
          "Administrative law",
          "Coverage is being extended into Dutch administrative law. Available to design partners during the beta.",
          "status-expanding",
        ],
      ],
      footer:
        "Other practice areas are not yet supported. If yours is not on this list, Veridicta is not ready for it - and we would rather tell you now.",
    },
    how: {
      eyebrow: "How it works",
      title: "Three steps. No black box.",
      search: "Wat geldt bij opzegging...",
      sourceHeader: "Dutch legal source",
      steps: [
        ["01", "Ask or search", "Ask a legal question or search Dutch legislation and case law directly."],
        [
          "02",
          "Receive cited sources",
          "Veridicta retrieves relevant statutes and rulings, then links substantive claims to sources.",
        ],
        [
          "03",
          "Inspect and decide",
          "Open the source, read the passage in context, save the research, and decide what is legally usable.",
        ],
      ],
    },
    trust: {
      eyebrow: "How we think about trust",
      title: "Principles, not promises.",
      lede:
        "Veridicta is in private beta. We do not claim enterprise certifications or public production readiness. What we can commit to today is how the product behaves.",
      items: [
        [
          "Source-first answers",
          "Every substantive answer is anchored to Dutch legal materials. If the system cannot ground a claim in a source, the claim does not ship.",
        ],
        [
          "Citations are inspectable",
          "No hidden references. Cited statutes and rulings can be opened for review in context.",
        ],
        [
          "Refusal over fabrication",
          "When the corpus does not support a confident answer, Veridicta says so. We would rather return less than return something wrong.",
        ],
        [
          "Lawyer review is required",
          "Veridicta is a research assistant. Output is a starting point for a qualified professional, never a substitute for one.",
        ],
        [
          "Beta safeguards in progress",
          "Operational practices for private beta are being tightened. We will not claim formal certifications or public self-serve readiness until they are actually in place.",
        ],
      ],
    },
    clarity: {
      title: "What Veridicta is - and is not.",
      isTitle: "What Veridicta is today:",
      is: [
        "A research assistant for Dutch employment and tenancy law",
        "Administrative law coverage expanding in beta",
        "Source-backed answers and inspectable citations",
        "Saved research notes and draft memos for lawyer review",
      ],
      isNotTitle: "What Veridicta is not:",
      isNot: [
        "A broad cross-border law platform",
        "A complete case management system",
        "A public self-serve production product",
        "A replacement for legal judgment",
      ],
    },
    beta: {
      eyebrow: "Private beta",
      title: "We are working with a small group of Dutch legal teams.",
      paragraphs: [
        "Veridicta is in invitation-only beta. We are partnering with a limited number of Dutch lawyers, in-house teams, and firms who want to evaluate AI-assisted research on real matters - and who are willing to tell us where it falls short.",
        "Design partners get direct access to the team, influence over the roadmap, and a product that is being shaped around their workflows.",
      ],
      whoTitle: "Who we are looking for:",
      who: [
        "Dutch lawyers and paralegals working in employment, tenancy, or administrative law",
        "In-house legal teams handling Dutch matters",
        "Firms validating AI-assisted research workflows for production use",
      ],
    },
    final: {
      title: "See it on your own questions.",
      lede:
        "The fastest way to evaluate Veridicta is to bring a real research question and watch how the system handles it. Walkthroughs are run by the team, take about thirty minutes, and end with you deciding whether beta access is worth your time.",
      direct: "Or email us directly:",
    },
    footer: {
      tagline: "Dutch legal research, grounded in sources.",
      beta:
        "Beta disclaimer: Veridicta is in private beta. Features, coverage, and performance are evolving. Coverage is currently limited to selected Dutch practice areas.",
      disclaimer:
        "Veridicta supports legal research. It does not provide legal advice and does not replace professional legal judgment. Output must be reviewed by a qualified legal professional before being relied upon.",
    },
  },
  nl: {
    nav: {
      product: "Product",
      practice: "Rechtsgebieden",
      trust: "Vertrouwen",
      beta: "Bèta",
      signIn: "Inloggen",
      request: "Vraag bèta-toegang aan",
    },
    hero: {
      beta: "Besloten bèta · Alleen op uitnodiging",
      title: "Nederlands juridisch onderzoek, geworteld in bronnen.",
      subtitle:
        "Veridicta is een onderzoeksassistent voor Nederlandse juridische professionals. Stel een vraag, krijg een antwoord onderbouwd met Nederlandse wetgeving en rechtspraak, en inspecteer elke bronvermelding voordat u erop vertrouwt.",
      walkthrough: "Plan een demonstratie",
      disclaimer:
        "Gebouwd voor advocaten en juristen. Momenteel gericht op arbeidsrecht en huurrecht, met bestuursrecht in uitbreiding. Veridicta ondersteunt onderzoek; het vervangt geen juridisch oordeel.",
      query: "Wat geldt bij opzegging van huur van woonruimte?",
      badge: "Controle door jurist vereist",
      answer:
        "Bij opzegging van huur van woonruimte haalt de assistent relevante Nederlandse juridische bronnen op en markeert het antwoord voor professionele controle.",
      trust: "Onvoldoende bronnen gevonden voor overige gronden",
      sourceTitle: "Bronpassage",
      sourceLink: "Inspecteer bron →",
      sourceBody:
        "De relevante passage wordt hier in context getoond, zodat een jurist kan controleren of de bron het antwoord ondersteunt.",
      promise: "Elke bron kan worden geopend en gecontroleerd voordat u het antwoord gebruikt.",
    },
    problem: {
      eyebrow: "Het onderzoeksprobleem",
      title: "Juridisch onderzoek is traag omdat bronnen versnipperd zijn.",
      lede:
        "Wetgeving staat in één systeem, rechtspraak in een ander, interne memo's in een derde. Het verifiëren van een enkel antwoord betekent wisselen van tabbladen, artikelen herlezen en de exacte passage opsporen die de conclusie ondersteunt. Generieke AI-tools versnellen het schrijven, maar tonen zelden hun bronnen — en een antwoord zonder bron is een risico, geen kortere weg.",
      strong:
        "Veridicta is gebouwd op de tegenovergestelde aanname: de bronvermelding is het antwoord. De tekst is slechts de weg ernaartoe.",
      cards: [
        [
          "Versnipperde bronnen",
          "Wetgeving, jurisprudentie en commentaar bevinden zich in gescheiden systemen. Het controleren van één vraag duurt langer dan het beantwoorden ervan.",
        ],
        [
          "Overhead door bronvermelding",
          "Elke bewering heeft een bron nodig. Het lezen, kopiëren en verifiëren van passages is het traagste onderdeel van elk memo.",
        ],
        [
          "Ongefundeerde AI is riskant",
          "Een zelfverzekerde alinea zonder bronvermelding is geen onderzoek. Het is een concept dat u nog steeds vanaf nul moet verifiëren.",
        ],
      ],
    },
    product: {
      eyebrow: "Wat Veridicta doet",
      title: "Een onderzoeksworkflow gebouwd rond verifieerbare bronnen.",
      lede: "Kernmogelijkheden die beschikbaar zijn in de huidige besloten bèta.",
      chipA: "Broninspectie",
      chipB: "Antwoord onderbouwd met bronnen",
      capabilities: [
        [
          "Doorzoek Nederlands juridisch materiaal",
          "Zoek in één interface door ingelezen Nederlandse wetgeving en rechtspraak. Resultaten linken direct naar de onderliggende bron, niet naar een parafrase.",
        ],
        [
          "Stel vragen, onderbouwd door bronnen",
          "Stel een juridische vraag in natuurlijke taal. Veridicta geeft een antwoord met bronvermeldingen naar de materialen waarop het zich baseerde. Als het corpus geen zeker antwoord kan geven, wordt dat direct aangegeven.",
        ],
        [
          "Inspecteer elke bronvermelding",
          "Open een bronvermelding om de bronpassage in context te zien. U beslist of de geciteerde autoriteit het antwoord ondersteunt.",
        ],
        [
          "Sla onderzoek op in een Matter",
          "Bewaar nuttige antwoorden, vragen en bronmetadata samen in een werkruimte voor latere controle.",
        ],
        [
          "Maak een onderzoeksnotitie",
          "Zet een onderbouwde opgeslagen notitie om in een conceptmemo dat bronvermeldingen behoudt en duidelijk gemarkeerd blijft voor juristencontrole.",
        ],
        [
          "Gebruik optionele spraakinvoer",
          "Dicteer een Nederlandse onderzoeksvraag in ondersteunde browsers, controleer het transcript en verstuur het daarna als normale assistentvraag.",
        ],
      ],
    },
    practice: {
      eyebrow: "Huidige focus",
      title: "Diepte boven breedte.",
      lede:
        "Veridicta wordt rechtsgebied per rechtsgebied opgebouwd. We zijn liever echt nuttig in twee domeinen dan oppervlakkig in tien.",
      areas: [
        [
          "Beschikbaar",
          "Arbeidsrecht",
          "Nederlandse arbeidswetgeving en rechtspraak, inclusief ontslag, contracten en arbeidsvoorwaarden.",
          "status-available",
        ],
        [
          "Beschikbaar",
          "Huurrecht",
          "Vragen over huurrecht voor woon- en bedrijfsruimtes, gebaseerd op relevante Nederlandse wetgeving en rechtspraak.",
          "status-available",
        ],
        [
          "Uitbreidend",
          "Bestuursrecht",
          "Dekking wordt momenteel uitgebreid naar het Nederlandse bestuursrecht. Beschikbaar voor designpartners tijdens de bèta.",
          "status-expanding",
        ],
      ],
      footer:
        "Andere rechtsgebieden worden nog niet ondersteund. Staat uw gebied niet op deze lijst, dan is Veridicta er nog niet klaar voor - en dat vertellen we u liever direct.",
    },
    how: {
      eyebrow: "Hoe het werkt",
      title: "Drie stappen. Geen black box.",
      search: "Wat geldt bij opzegging...",
      sourceHeader: "Nederlandse juridische bron",
      steps: [
        ["01", "Vraag of zoek", "Stel een juridische vraag of zoek direct in Nederlandse wetgeving en rechtspraak."],
        [
          "02",
          "Ontvang geciteerde bronnen",
          "Veridicta haalt relevante wetten en uitspraken op en koppelt inhoudelijke beweringen aan bronnen.",
        ],
        [
          "03",
          "Inspecteer en beslis",
          "Open de bron, lees de passage in context, bewaar het onderzoek en beslis wat juridisch bruikbaar is.",
        ],
      ],
    },
    trust: {
      eyebrow: "Hoe we over vertrouwen denken",
      title: "Principes, geen beloften.",
      lede:
        "Veridicta is in besloten bèta. We claimen geen enterprise-certificeringen of publieke productierijpheid. Wat we vandaag kunnen toezeggen, is hoe het product zich gedraagt.",
      items: [
        [
          "Bronnen eerst",
          "Elk inhoudelijk antwoord is verankerd in Nederlandse juridische materialen. Als het systeem een bewering niet kan onderbouwen, wordt die bewering niet geleverd.",
        ],
        [
          "Bronvermeldingen zijn inspecteerbaar",
          "Geen verborgen verwijzingen. Geciteerde wetten en uitspraken kunnen in context worden geopend voor controle.",
        ],
        [
          "Weigeren boven verzinnen",
          "Wanneer het corpus geen zeker antwoord ondersteunt, zegt Veridicta dat. We geven liever minder terug dan iets verkeerds.",
        ],
        [
          "Juristencontrole is vereist",
          "Veridicta is een onderzoeksassistent. Output is een vertrekpunt voor een gekwalificeerde professional, nooit een vervanging daarvan.",
        ],
        [
          "Bèta-waarborgen in ontwikkeling",
          "Operationele werkwijzen voor de besloten bèta worden aangescherpt. We claimen geen formele certificeringen of publieke selfservice-gereedheid voordat die werkelijk bestaan.",
        ],
      ],
    },
    clarity: {
      title: "Wat Veridicta is - en niet is.",
      isTitle: "Wat Veridicta vandaag is:",
      is: [
        "Een onderzoeksassistent voor Nederlands arbeidsrecht en huurrecht",
        "Bestuursrechtelijke dekking in uitbreiding tijdens de bèta",
        "Antwoorden met bronnen en inspecteerbare citaties",
        "Opgeslagen onderzoeksnotities en conceptmemo's voor juristencontrole",
      ],
      isNotTitle: "Wat Veridicta niet is:",
      isNot: [
        "Een breed grensoverschrijdend rechtsplatform",
        "Een compleet zaakbeheersysteem",
        "Een publiek selfservice-product",
        "Een vervanging voor juridisch oordeel",
      ],
    },
    beta: {
      eyebrow: "Besloten bèta",
      title: "We werken met een kleine groep Nederlandse juridische teams.",
      paragraphs: [
        "Veridicta is een bèta op uitnodiging. We werken samen met een beperkt aantal Nederlandse advocaten, bedrijfsjuristen en kantoren die AI-ondersteund onderzoek op echte dossiers willen evalueren - en die ons willen vertellen waar het tekortschiet.",
        "Designpartners krijgen direct contact met het team, invloed op de roadmap en een product dat rond hun workflows wordt gevormd.",
      ],
      whoTitle: "Wie we zoeken:",
      who: [
        "Nederlandse advocaten en paralegals in arbeidsrecht, huurrecht of bestuursrecht",
        "In-house juridische teams die Nederlandse zaken behandelen",
        "Kantoren die AI-ondersteunde researchworkflows valideren voor productiegebruik",
      ],
    },
    final: {
      title: "Bekijk het met uw eigen vragen.",
      lede:
        "De snelste manier om Veridicta te beoordelen is een echte onderzoeksvraag meenemen en zien hoe het systeem daarmee omgaat. Walkthroughs worden door het team gegeven, duren ongeveer dertig minuten en eindigen met uw beslissing of bèta-toegang de moeite waard is.",
      direct: "Of mail ons direct:",
    },
    footer: {
      tagline: "Nederlands juridisch onderzoek, geworteld in bronnen.",
      beta:
        "Bèta-disclaimer: Veridicta is in besloten bèta. Functies, dekking en prestaties ontwikkelen zich. Dekking is momenteel beperkt tot geselecteerde Nederlandse rechtsgebieden.",
      disclaimer:
        "Veridicta ondersteunt juridisch onderzoek. Het geeft geen juridisch advies en vervangt geen professioneel juridisch oordeel. Output moet door een gekwalificeerde juridische professional worden gecontroleerd voordat erop wordt vertrouwd.",
    },
  },
} as const;

function LanguageToggle({
  locale,
  setLocale,
  mobile = false,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  mobile?: boolean;
}) {
  return (
    <div className={mobile ? "lang-switcher-mobile" : "lang-switcher"}>
      <button
        type="button"
        className={`language-button ${locale === "nl" ? "active" : ""}`}
        onClick={() => setLocale("nl")}
        aria-pressed={locale === "nl"}
      >
        NL
      </button>
      <span className="sep">/</span>
      <button
        type="button"
        className={`language-button ${locale === "en" ? "active" : ""}`}
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}

function NavLinks({ labels, onNavigate }: { labels: NavCopy; onNavigate?: () => void }) {
  return (
    <>
      <a href="#product" onClick={onNavigate}>
        {labels.product}
      </a>
      <a href="#practice-areas" onClick={onNavigate}>
        {labels.practice}
      </a>
      <a href="#trust" onClick={onNavigate}>
        {labels.trust}
      </a>
      <a href="#beta" onClick={onNavigate}>
        {labels.beta}
      </a>
    </>
  );
}

export function ApprovedStaticLanding() {
  const [locale, setLocale] = useState<Locale>("nl");
  const [menuOpen, setMenuOpen] = useState(false);
  const t = copy[locale];
  const rootClassName = useMemo(() => `${styles.root} static-landing`, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const elements = document.querySelectorAll(
      ".static-landing .section, .static-landing .fade-in-section",
    );
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [locale]);

  return (
    <div className={rootClassName}>
      <header className="header">
        <div className="container header-container">
          <button
            type="button"
            className="logo logo-button"
            aria-label="Veridicta home"
            onClick={() => {
              setMenuOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Veridicta
          </button>
          <nav className="desktop-nav" aria-label="Primary">
            <NavLinks labels={t.nav} />
          </nav>
          <div className="header-actions">
            <LanguageToggle locale={locale} setLocale={setLocale} />
            <Link href="/login" className="btn-text">
              {t.nav.signIn}
            </Link>
            <a href={betaHref} className="btn-primary btn-small">
              {t.nav.request}
            </a>
          </div>
          <button
            className={`mobile-menu-toggle ${menuOpen ? "is-active" : ""}`}
            type="button"
            aria-label={locale === "en" ? "Toggle menu" : "Menu in/uitschakelen"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="bar" />
            <span className="bar" />
          </button>
        </div>
        <div className={`mobile-menu ${menuOpen ? "is-active" : ""}`}>
          <nav className="mobile-nav" aria-label="Mobile primary">
            <NavLinks labels={t.nav} onNavigate={() => setMenuOpen(false)} />
          </nav>
          <div className="mobile-actions">
            <LanguageToggle locale={locale} setLocale={setLocale} mobile />
            <Link href="/login" className="btn-text">
              {t.nav.signIn}
            </Link>
            <a href={betaHref} className="btn-primary">
              {t.nav.request}
            </a>
          </div>
        </div>
      </header>

      <main>
        <div className="hero-bg-wrapper">
          <section className="hero container">
            <div className="hero-content text-center center-block fade-in-section">
              <div className="beta-text-simple">{t.hero.beta}</div>
              <h1 className="hero-title">{t.hero.title}</h1>
              <p className="hero-subtitle center-block">{t.hero.subtitle}</p>
              <div className="hero-ctas justify-center">
                <a href={betaHref} className="btn-primary btn-large">
                  {t.nav.request}
                </a>
                <a href={walkthroughHref} className="btn-secondary btn-large">
                  {t.hero.walkthrough}
                </a>
              </div>
              <p className="hero-disclaimer center-block">{t.hero.disclaimer}</p>
            </div>

            <div className="mockup-wrapper mt-lg fade-in-section">
              <div className="mockup-container">
                <div className="mockup-query">{t.hero.query}</div>
                <div className="mockup-answer">
                  <div className="mockup-badge">{t.hero.badge}</div>
                  <p>
                    {t.hero.answer} <span className="citation-mark">1</span>
                  </p>
                  <div className="mockup-citations">
                    <div className="citation-chip">
                      <span className="chip-tag">BWB · Boek 7</span>
                      <span className="chip-text">Article context</span>
                    </div>
                    <div className="citation-chip">
                      <span className="chip-tag">Rechtspraak</span>
                      <span className="chip-text">Selected ruling</span>
                    </div>
                  </div>
                  <div className="mockup-trust-state">
                    <span className="trust-icon" aria-hidden="true">
                      !
                    </span>{" "}
                    {t.hero.trust}
                  </div>
                </div>
                <div className="mockup-inspection">
                  <div className="inspection-header">
                    <span className="inspection-title">{t.hero.sourceTitle}</span>
                    <span className="inspection-link">{t.hero.sourceLink}</span>
                  </div>
                  <div className="inspection-body">{t.hero.sourceBody}</div>
                </div>
              </div>
              <p className="mockup-promise text-center">{t.hero.promise}</p>
            </div>
          </section>
        </div>

        <section id="problem" className="section section-alt">
          <div className="container">
            <div className="section-intro">
              <div className="eyebrow">{t.problem.eyebrow}</div>
              <h2 className="section-title">{t.problem.title}</h2>
              <p className="section-lede">{t.problem.lede}</p>
              <p className="section-lede-strong">{t.problem.strong}</p>
            </div>

            <div className="grid-3 problem-grid">
              {t.problem.cards.map(([title, body]) => (
                <div className="editorial-card" key={title}>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="product" className="section">
          <div className="container">
            <div className="asymmetric-layout">
              <div className="layout-main">
                <div className="eyebrow">{t.product.eyebrow}</div>
                <h2 className="section-title">{t.product.title}</h2>
                <p className="section-lede">{t.product.lede}</p>
                <div className="product-css-card mt-lg fade-in-section">
                  <div className="css-card-content">
                    <div className="css-card-chips">
                      <div className="citation-chip">
                        <span className="chip-tag">BWB · Book 7</span>
                      </div>
                      <div className="citation-chip">
                        <span className="chip-tag">Rechtspraak</span>
                      </div>
                    </div>
                    <div className="css-card-item">{t.product.chipA}</div>
                    <div className="css-card-item">{t.product.chipB}</div>
                  </div>
                </div>
              </div>
              <div className="layout-side">
                <div className="capability-list extended">
                  {t.product.capabilities.map(([title, body]) => (
                    <div className="capability-item" key={title}>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="practice-areas" className="section section-alt">
          <div className="container">
            <div className="section-intro">
              <div className="eyebrow">{t.practice.eyebrow}</div>
              <h2 className="section-title">{t.practice.title}</h2>
              <p className="section-lede">{t.practice.lede}</p>
            </div>
            <div className="grid-3 practice-grid">
              {t.practice.areas.map(([status, title, body, statusClass]) => (
                <div className="card-practice" key={title}>
                  <div className={`card-status ${statusClass}`}>{status}</div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              ))}
            </div>
            <div className="practice-footer">
              <p>{t.practice.footer}</p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-intro text-center">
              <div className="eyebrow">{t.how.eyebrow}</div>
              <h2 className="section-title">{t.how.title}</h2>
            </div>

            <div className="triptych-container mb-lg fade-in-section">
              <div className="triptych-panel">
                <div className="triptych-search-bar">
                  <span className="search-icon" aria-hidden="true">
                    ?
                  </span>{" "}
                  {t.how.search}
                </div>
                <div className="triptych-doc">
                  <div className="doc-line doc-line-title" />
                  <div className="doc-line" />
                  <div className="doc-line" />
                </div>
              </div>
              <div className="triptych-panel panel-highlight">
                <div className="triptych-chips">
                  <div className="citation-chip">
                    <span className="chip-tag">BWB</span>{" "}
                    <span className="chip-text">Article context</span>
                  </div>
                  <div className="citation-chip">
                    <span className="chip-tag">Rechtspraak</span>{" "}
                    <span className="chip-text">Selected ruling</span>
                  </div>
                </div>
                <div className="triptych-source-card">
                  <div className="source-card-header">{t.how.sourceHeader}</div>
                  <div className="doc-line" />
                  <div className="doc-line" />
                </div>
              </div>
              <div className="triptych-panel">
                <div className="mockup-inspection inspection-compact">
                  <div className="inspection-header">
                    <span className="inspection-title">{t.hero.sourceTitle}</span>
                  </div>
                  <div className="inspection-body">{t.hero.sourceBody}</div>
                </div>
                <div className="mockup-badge badge-inline">{t.hero.badge}</div>
              </div>
            </div>

            <div className="grid-3 steps-grid">
              {t.how.steps.map(([number, title, body]) => (
                <div className="step-card" key={number}>
                  <div className="step-number">{number}</div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="trust" className="section section-alt">
          <div className="container">
            <div className="section-intro">
              <div className="eyebrow">{t.trust.eyebrow}</div>
              <h2 className="section-title">{t.trust.title}</h2>
              <p className="section-lede">{t.trust.lede}</p>
            </div>

            <div className="grid-2 trust-grid">
              {t.trust.items.map(([title, body], index) => (
                <div
                  className={`trust-item ${index === t.trust.items.length - 1 ? "grid-span-2" : ""}`}
                  key={title}
                >
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section clarity-section">
          <div className="container">
            <h2 className="section-title text-center">{t.clarity.title}</h2>
            <div className="clarity-block">
              <div className="clarity-col clarity-is">
                <h3>{t.clarity.isTitle}</h3>
                <ul>
                  {t.clarity.is.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="clarity-col clarity-is-not">
                <h3>{t.clarity.isNotTitle}</h3>
                <ul>
                  {t.clarity.isNot.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="beta" className="section section-alt beta-section">
          <div className="container">
            <div className="beta-content">
              <div className="eyebrow">{t.beta.eyebrow}</div>
              <h2 className="section-title">{t.beta.title}</h2>
              <div className="beta-text">
                {t.beta.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                <h3>{t.beta.whoTitle}</h3>
                <ul>
                  {t.beta.who.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="beta-cta mt-lg">
                <a href={betaHref} className="btn-primary btn-large">
                  {t.nav.request}
                </a>
              </div>
            </div>
          </div>
        </section>

        <div className="hero-bg-wrapper">
          <section className="section final-cta">
            <div className="container text-center fade-in-section">
              <h2 className="section-title">{t.final.title}</h2>
              <p className="section-lede center-block">{t.final.lede}</p>
              <div className="hero-ctas justify-center mt-lg">
                <a href={betaHref} className="btn-primary btn-large">
                  {t.nav.request}
                </a>
                <a href={walkthroughHref} className="btn-secondary btn-large">
                  {t.hero.walkthrough}
                </a>
              </div>
              <div className="tertiary-cta">
                {t.final.direct} <a href={emailHref}>hello@veridicta.nl</a>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="logo">Veridicta</div>
              <p>{t.footer.tagline}</p>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <a href="#product">{t.nav.product}</a>
                <a href="#practice-areas">{t.nav.practice}</a>
                <a href="#trust">{t.nav.trust}</a>
              </div>
              <div className="footer-col">
                <a href="#beta">{t.nav.beta}</a>
                <Link href="/login">{t.nav.signIn}</Link>
                <a href={emailHref}>hello@veridicta.nl</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-disclaimer">
              <p>
                <strong>{t.footer.beta.split(":")[0]}:</strong>
                {t.footer.beta.slice(t.footer.beta.indexOf(":") + 1)}
              </p>
              <p>{t.footer.disclaimer}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
