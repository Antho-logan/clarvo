export const supportedLocales = [
  { code: "en", label: "English" },
  { code: "nl", label: "Nederlands" },
] as const;

export type Locale = (typeof supportedLocales)[number]["code"];

export const defaultLocale: Locale = "en";

export const betaAccessHref =
  "mailto:hello@veridicta.nl?subject=Veridicta%20beta%20access%20request&body=Naam%3A%0AOrganisatie%3A%0ARechtsgebied%3A%0AKorte%20toelichting%3A%0A";

export const walkthroughHref =
  "mailto:hello@veridicta.nl?subject=Veridicta%20walkthrough%20request&body=Naam%3A%0AOrganisatie%3A%0ARechtsgebied%3A%0AVoorkeur%20tijdstip%3A%0A";

export const directEmailHref = "mailto:hello@veridicta.nl";

type NavKey = "workflows" | "practiceAreas" | "security" | "company";

type LandingCopy = {
  header: {
    nav: Record<NavKey, string>;
    login: string;
    requestDemo: string;
    languageLabel: string;
  };
  hero: {
    banner: string;
    titleLead: string;
    titleAccent: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    panelLabel: string;
    riskBadge: string;
    lawBadge: string;
    panelAction: string;
    trustStrip: [string, string, string];
  };
  valueProp: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string;
    description: string;
    pillars: Array<{
      title: string;
      description: string;
    }>;
    discoverCapability: string;
  };
  productDemo: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string;
    description: string;
    matterBadge: string;
    languageBadge: string;
    prompt: {
      beforeLaw: string;
      highlightedLaw: string;
      between: string;
      highlightedDeliverable: string;
      after: string;
    };
    chips: string[];
    primaryCta: string;
    capabilities: Array<{
      title: string;
      description: string;
    }>;
    stepsTitle: string;
    stepsSubtitle: string;
    steps: Array<{
      title: string;
      description: string;
    }>;
  };
  features: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string;
    description: string;
    footerLine: string;
    items: Array<{
      title: string;
      badge: string;
      description: string;
      bullets: string[];
    }>;
    exploreWorkflow: string;
    analysisComplete: string;
    analysisSummary: string;
  };
  metrics: {
    title: string;
    columns: Array<{
      title: string;
      items: string[];
    }>;
  };
  caseStudies: {
    titleLead: string;
    titleAccent: string;
    subtitle: string;
    principles: Array<{
      title: string;
      body: string;
    }>;
  };
  security: {
    badge: string;
    titleLead: string;
    titleAccent: string;
    description: string;
    principles: Array<{
      title: string;
      desc: string;
    }>;
  };
  cta: {
    betaEyebrow: string;
    betaTitle: string;
    betaDescription: string;
    betaPartnerLine: string;
    betaListTitle: string;
    betaList: string[];
    betaCta: string;
    titleLead: string;
    titleAccent: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    tertiaryLine: string;
  };
  footer: {
    description: string;
    betaDisclaimer: string;
    rightsReserved: string;
    legalLinks: [string, string, string];
  };
};

export const landingCopy: Record<Locale, LandingCopy> = {
  en: {
    header: {
      nav: {
        workflows: "How it works",
        practiceAreas: "Practice areas",
        security: "Trust",
        company: "Company",
      },
      login: "Sign in",
      requestDemo: "Request beta access",
      languageLabel: "Language",
    },
    hero: {
      banner: "Private beta - Invitation only",
      titleLead: "Dutch legal research,",
      titleAccent: "grounded in sources.",
      description:
        "Veridicta is a research assistant for Dutch legal professionals. Ask a question, get an answer backed by Dutch legislation and case law, and inspect every citation before you rely on it.",
      primaryCta: "Request beta access",
      secondaryCta: "Book a walkthrough",
      panelLabel: "Citation inspection",
      riskBadge: "Source-backed",
      lawBadge: "Dutch law",
      panelAction: "Inspect source",
      trustStrip: [
        "Built for lawyers",
        "Focused on employment and tenancy law",
        "Supports research; does not replace legal judgment",
      ],
    },
    valueProp: {
      eyebrow: "The research problem",
      titleLead: "Legal research is slow because",
      titleAccent: "the sources are scattered.",
      description:
        "Statutes live in one system, case law in another, internal memos in a third. Verifying a single answer means switching tabs, re-reading articles, and tracking down the exact passage that supports the conclusion. Veridicta is built around the opposite assumption: the citation is the answer. The prose is just how you get there.",
      pillars: [
        {
          title: "Fragmented sources.",
          description:
            "Legislation, case law, and commentary sit in separate systems. Cross-checking one question takes longer than answering it.",
        },
        {
          title: "Citation overhead.",
          description:
            "Every claim needs a source. Reading, copying, and verifying passages is the slowest part of any memo.",
        },
        {
          title: "Ungrounded AI is risky.",
          description:
            "A confident paragraph without a citation is not research. It is a draft you still have to verify from scratch.",
        },
      ],
      discoverCapability: "Read more",
    },
    productDemo: {
      eyebrow: "What Veridicta does",
      titleLead: "A research workflow built",
      titleAccent: "around verifiable sources.",
      description: "Four capabilities, all available in the current beta.",
      matterBadge: "Dutch legal research",
      languageBadge: "Source inspection",
      prompt: {
        beforeLaw: "Ask whether a dismissal issue is supported by ",
        highlightedLaw: "Dutch employment law",
        between: ", review the cited ruling, and prepare a ",
        highlightedDeliverable: "source-backed research note",
        after: " before drafting.",
      },
      chips: [
        "Legislation",
        "Case law",
        "Citation context",
        "Research notes",
        "Lawyer review",
      ],
      primaryCta: "Request beta access",
      capabilities: [
        {
          title: "Search Dutch legal materials",
          description:
            "Search across ingested Dutch legislation and case law from a single interface. Results link to the underlying source, not a paraphrase.",
        },
        {
          title: "Ask source-backed questions",
          description:
            "Pose a legal question in natural language. Veridicta returns an answer with inline citations to the specific articles and rulings it relied on. When the corpus does not support a confident answer, it says so instead of guessing.",
        },
        {
          title: "Inspect every citation",
          description:
            "Open any citation to see the source passage in context, on its own detail page. You decide whether the cited authority actually supports the answer.",
        },
        {
          title: "Prepare research faster",
          description:
            "Pull together statutes, rulings, and answers in one place so you can move from research to drafting without rebuilding the trail.",
        },
      ],
      stepsTitle: "Three steps. No black box.",
      stepsSubtitle: "How it works",
      steps: [
        {
          title: "Ask or search",
          description:
            "Type a legal question or search Dutch legislation and case law directly. The interface is designed for how lawyers actually work, not for general-purpose chat.",
        },
        {
          title: "Get cited sources",
          description:
            "Veridicta retrieves the relevant statutes and rulings, drafts an answer, and attaches the citations it used. Every claim is traceable.",
        },
        {
          title: "Inspect and decide",
          description:
            "Open each source on its detail page, read the passage in context, and judge for yourself. Use what holds up; discard what does not. The lawyer stays in the loop.",
        },
      ],
    },
    features: {
      eyebrow: "Current focus",
      titleLead: "Deep before",
      titleAccent: "broad.",
      description:
        "Veridicta is built one practice area at a time. We would rather be genuinely useful in two domains than shallow across ten.",
      footerLine:
        "Other practice areas are not yet supported. If yours is not on this list, Veridicta is not ready for it yet - and we would rather tell you now.",
      items: [
        {
          title: "Employment law",
          badge: "Available",
          description:
            "Dutch employment legislation and selected case law, including dismissal, contracts, and working conditions.",
          bullets: ["Dismissal", "Contracts", "Working conditions"],
        },
        {
          title: "Tenancy law",
          badge: "Available",
          description:
            "Residential and commercial tenancy questions, grounded in relevant Burgerlijk Wetboek provisions and available case law.",
          bullets: ["Residential tenancy", "Commercial tenancy", "BW provisions"],
        },
        {
          title: "Administrative law",
          badge: "Expanding",
          description:
            "Coverage is being extended into Dutch administrative law. Available to design partners during the beta.",
          bullets: ["Beta coverage", "Design partners", "Dutch matters"],
        },
      ],
      exploreWorkflow: "Current beta focus",
      analysisComplete: "Coverage status",
      analysisSummary: "Limited to selected Dutch practice areas.",
    },
    metrics: {
      title: "What Veridicta is - and is not",
      columns: [
        {
          title: "What Veridicta is today",
          items: [
            "A research assistant for Dutch employment and tenancy law",
            "Source-backed answers",
            "Inspectable citations",
            "Built for lawyer review",
          ],
        },
        {
          title: "What Veridicta is not",
          items: [
            "A full EU law platform",
            "A case management system",
            "A certified enterprise security product",
            "A replacement for legal judgment",
          ],
        },
      ],
    },
    caseStudies: {
      titleLead: "Design",
      titleAccent: "principles",
      subtitle: "The product is shaped around verification, not persuasion.",
      principles: [
        {
          title: "Source-first answers",
          body: "Every substantive answer is anchored to Dutch legal materials.",
        },
        {
          title: "Citations are inspectable",
          body: "Every cited statute and ruling can be opened and reviewed in context.",
        },
        {
          title: "Refusal over fabrication",
          body: "When the corpus does not support a confident answer, Veridicta says so.",
        },
      ],
    },
    security: {
      badge: "How we think about trust",
      titleLead: "Principles,",
      titleAccent: "not promises.",
      description:
        "Veridicta is in private beta. We do not yet hold enterprise security certifications, and we will not claim ones we do not have. What we can commit to today is how the product behaves.",
      principles: [
        {
          title: "Source-first answers",
          desc: "Every substantive answer is anchored to Dutch legal materials. If the system cannot ground a claim in a source, the claim does not ship.",
        },
        {
          title: "Citations are inspectable",
          desc: "No hidden references. Every cited statute and ruling has its own detail page, viewable in full context.",
        },
        {
          title: "Refusal over fabrication",
          desc: "When the corpus does not support a confident answer, Veridicta says so. We would rather return less than return something wrong.",
        },
        {
          title: "Lawyer review is required",
          desc: "Veridicta is a research assistant. Output is a starting point for a qualified professional, never a substitute for one.",
        },
        {
          title: "Security foundations in progress",
          desc: "Standard practices for data handling are in place for the beta. Formal certifications such as ISO 27001 and SOC 2 are on the roadmap, not in hand.",
        },
      ],
    },
    cta: {
      betaEyebrow: "Private beta",
      betaTitle: "We are working with a small group of Dutch legal teams.",
      betaDescription:
        "Veridicta is in invitation-only beta. We are partnering with a limited number of Dutch lawyers, in-house teams, and firms who want to evaluate AI-assisted research on real matters - and who are willing to tell us where it falls short.",
      betaPartnerLine:
        "Design partners get direct access to the team, influence over the roadmap, and a product shaped around their workflows.",
      betaListTitle: "Who we are looking for",
      betaList: [
        "Dutch lawyers and paralegals working in employment, tenancy, or administrative law",
        "In-house legal teams handling Dutch matters",
        "Firms validating AI-assisted research workflows for production use",
      ],
      betaCta: "Request beta access",
      titleLead: "See it on",
      titleAccent: "your own questions.",
      description:
        "The fastest way to evaluate Veridicta is to bring a real research question and watch how the system handles it. Walkthroughs are run by the team, take about thirty minutes, and end with you deciding whether beta access is worth your time.",
      primaryCta: "Request beta access",
      secondaryCta: "Book a walkthrough",
      tertiaryLine: "Or email us directly: hello@veridicta.nl",
    },
    footer: {
      description:
        "Veridicta supports legal research. It does not provide legal advice and does not replace professional legal judgment. Output must be reviewed by a qualified legal professional before being relied upon.",
      betaDisclaimer:
        "Veridicta is in private beta. Features, coverage, and performance are evolving. Coverage is currently limited to selected Dutch practice areas.",
      rightsReserved: "All rights reserved.",
      legalLinks: ["Privacy", "Terms", "Contact"],
    },
  },
  nl: {
    header: {
      nav: {
        workflows: "Werkwijze",
        practiceAreas: "Rechtsgebieden",
        security: "Vertrouwen",
        company: "Bedrijf",
      },
      login: "Inloggen",
      requestDemo: "Beta-toegang aanvragen",
      languageLabel: "Taal",
    },
    hero: {
      banner: "Private beta - Alleen op uitnodiging",
      titleLead: "Nederlands juridisch onderzoek,",
      titleAccent: "gebaseerd op bronnen.",
      description:
        "Veridicta is een onderzoeksassistent voor Nederlandse juridische professionals. Stel een vraag, krijg een antwoord met Nederlandse wetgeving en rechtspraak als onderbouwing, en controleer elke bron voordat je erop vertrouwt.",
      primaryCta: "Beta-toegang aanvragen",
      secondaryCta: "Plan een walkthrough",
      panelLabel: "Broncontrole",
      riskBadge: "Met bronnen",
      lawBadge: "Nederlands recht",
      panelAction: "Controleer bron",
      trustStrip: [
        "Gebouwd voor juristen",
        "Focus op arbeidsrecht en huurrecht",
        "Ondersteunt onderzoek; vervangt geen juridisch oordeel",
      ],
    },
    valueProp: {
      eyebrow: "Het onderzoeksprobleem",
      titleLead: "Juridisch onderzoek kost tijd omdat",
      titleAccent: "bronnen verspreid zijn.",
      description:
        "Wetgeving staat in het ene systeem, rechtspraak in een ander, interne memo's in een derde. Een enkel antwoord controleren betekent tabs wisselen, artikelen herlezen en de exacte passage zoeken die de conclusie draagt. Veridicta is gebouwd rond het omgekeerde uitgangspunt: de bron is het antwoord.",
      pillars: [
        {
          title: "Verspreide bronnen.",
          description:
            "Wetgeving, rechtspraak en commentaar staan in aparte systemen. Een vraag controleren duurt vaak langer dan het antwoord schrijven.",
        },
        {
          title: "Bronlast.",
          description:
            "Elke stelling vraagt om een bron. Lezen, kopieren en controleren van passages is vaak het langzaamste deel van een memo.",
        },
        {
          title: "Ongegronde AI is riskant.",
          description:
            "Een zelfverzekerde alinea zonder bron is geen onderzoek. Het is een concept dat je opnieuw moet controleren.",
        },
      ],
      discoverCapability: "Lees verder",
    },
    productDemo: {
      eyebrow: "Wat Veridicta doet",
      titleLead: "Een onderzoeksproces gebouwd",
      titleAccent: "rond controleerbare bronnen.",
      description: "Vier mogelijkheden, allemaal beschikbaar in de huidige beta.",
      matterBadge: "Nederlands juridisch onderzoek",
      languageBadge: "Broncontrole",
      prompt: {
        beforeLaw: "Stel een vraag over ontslag onder ",
        highlightedLaw: "Nederlands arbeidsrecht",
        between: ", controleer de aangehaalde uitspraak en maak een ",
        highlightedDeliverable: "onderzoeksnotitie met bronnen",
        after: " voordat je gaat schrijven.",
      },
      chips: [
        "Wetgeving",
        "Rechtspraak",
        "Broncontext",
        "Onderzoeksnotities",
        "Jurist beoordeelt",
      ],
      primaryCta: "Beta-toegang aanvragen",
      capabilities: [
        {
          title: "Doorzoek Nederlandse juridische bronnen",
          description:
            "Doorzoek ingelezen Nederlandse wetgeving en rechtspraak vanuit een interface. Resultaten linken naar de onderliggende bron, niet naar een parafrase.",
        },
        {
          title: "Stel vragen met bronvermelding",
          description:
            "Stel een juridische vraag in gewone taal. Veridicta geeft een antwoord met verwijzingen naar de artikelen en uitspraken waarop het antwoord steunt.",
        },
        {
          title: "Controleer elke bron",
          description:
            "Open elke verwijzing en bekijk de passage in context op een eigen detailpagina. Jij bepaalt of de bron de conclusie draagt.",
        },
        {
          title: "Bereid onderzoek sneller voor",
          description:
            "Breng wetgeving, uitspraken en antwoorden bij elkaar zodat je kunt schrijven zonder het spoor opnieuw op te bouwen.",
        },
      ],
      stepsTitle: "Drie stappen. Geen black box.",
      stepsSubtitle: "Hoe het werkt",
      steps: [
        {
          title: "Vraag of zoek",
          description:
            "Typ een juridische vraag of doorzoek Nederlandse wetgeving en rechtspraak direct. De interface is ontworpen voor juridisch werk, niet voor algemene chat.",
        },
        {
          title: "Krijg bronnen met citaties",
          description:
            "Veridicta haalt relevante wetten en uitspraken op, maakt een antwoord en voegt de gebruikte citaties toe. Elke claim is herleidbaar.",
        },
        {
          title: "Controleer en beslis",
          description:
            "Open elke bron op de detailpagina, lees de passage in context en oordeel zelf. Gebruik wat standhoudt; leg weg wat dat niet doet.",
        },
      ],
    },
    features: {
      eyebrow: "Huidige focus",
      titleLead: "Eerst diep,",
      titleAccent: "dan breed.",
      description:
        "Veridicta wordt per rechtsgebied opgebouwd. We zijn liever echt bruikbaar in twee domeinen dan oppervlakkig in tien.",
      footerLine:
        "Andere rechtsgebieden worden nog niet ondersteund. Staat jouw rechtsgebied niet op deze lijst, dan is Veridicta daar nog niet klaar voor.",
      items: [
        {
          title: "Arbeidsrecht",
          badge: "Beschikbaar",
          description:
            "Nederlandse arbeidswetgeving en geselecteerde rechtspraak, waaronder ontslag, contracten en arbeidsvoorwaarden.",
          bullets: ["Ontslag", "Contracten", "Arbeidsvoorwaarden"],
        },
        {
          title: "Huurrecht",
          badge: "Beschikbaar",
          description:
            "Woonruimte en bedrijfsruimte, gebaseerd op relevante bepalingen uit het Burgerlijk Wetboek en beschikbare rechtspraak.",
          bullets: ["Woonruimte", "Bedrijfsruimte", "BW-bepalingen"],
        },
        {
          title: "Bestuursrecht",
          badge: "Uitbreiding",
          description:
            "Dekking wordt uitgebreid naar Nederlands bestuursrecht. Beschikbaar voor design partners tijdens de beta.",
          bullets: ["Beta-dekking", "Design partners", "Nederlandse zaken"],
        },
      ],
      exploreWorkflow: "Huidige beta-focus",
      analysisComplete: "Dekkingsstatus",
      analysisSummary: "Beperkt tot geselecteerde Nederlandse rechtsgebieden.",
    },
    metrics: {
      title: "Wat Veridicta wel en niet is",
      columns: [
        {
          title: "Wat Veridicta vandaag is",
          items: [
            "Een onderzoeksassistent voor Nederlands arbeidsrecht en huurrecht",
            "Antwoorden met bronnen",
            "Controleerbare citaties",
            "Gebouwd voor beoordeling door juristen",
          ],
        },
        {
          title: "Wat Veridicta niet is",
          items: [
            "Een volledig EU-rechtplatform",
            "Een zaaksysteem",
            "Een gecertificeerd enterprise-beveiligingsproduct",
            "Een vervanging voor juridisch oordeel",
          ],
        },
      ],
    },
    caseStudies: {
      titleLead: "Ontwerp",
      titleAccent: "principes",
      subtitle: "Het product draait om controle, niet om overtuiging.",
      principles: [
        {
          title: "Bronnen eerst",
          body: "Elk inhoudelijk antwoord is verankerd in Nederlandse juridische bronnen.",
        },
        {
          title: "Citaties zijn controleerbaar",
          body: "Elke aangehaalde wet of uitspraak kan in context worden geopend.",
        },
        {
          title: "Weigeren boven verzinnen",
          body: "Als de corpusbasis geen zeker antwoord draagt, zegt Veridicta dat.",
        },
      ],
    },
    security: {
      badge: "Hoe wij over vertrouwen denken",
      titleLead: "Principes,",
      titleAccent: "geen beloften.",
      description:
        "Veridicta is in private beta. We hebben nog geen enterprise-beveiligingscertificeringen en claimen die ook niet. Wat we vandaag kunnen toezeggen is hoe het product zich gedraagt.",
      principles: [
        {
          title: "Bronnen eerst",
          desc: "Elk inhoudelijk antwoord is verankerd in Nederlandse juridische bronnen. Als het systeem een stelling niet kan onderbouwen, wordt die stelling niet geleverd.",
        },
        {
          title: "Citaties zijn controleerbaar",
          desc: "Geen verborgen verwijzingen. Elke aangehaalde wet en uitspraak heeft een eigen detailpagina met context.",
        },
        {
          title: "Weigeren boven verzinnen",
          desc: "Als de corpusbasis geen zeker antwoord draagt, zegt Veridicta dat. Minder teruggeven is beter dan iets onjuists teruggeven.",
        },
        {
          title: "Juristen blijven verantwoordelijk",
          desc: "Veridicta is een onderzoeksassistent. Output is een startpunt voor een gekwalificeerde professional, nooit een vervanger.",
        },
        {
          title: "Beveiligingsfundament in ontwikkeling",
          desc: "Standaardpraktijken voor datahandling zijn aanwezig voor de beta. Formele certificeringen zoals ISO 27001 en SOC 2 staan op de roadmap, maar zijn nog niet behaald.",
        },
      ],
    },
    cta: {
      betaEyebrow: "Private beta",
      betaTitle: "We werken met een kleine groep Nederlandse juridische teams.",
      betaDescription:
        "Veridicta is alleen op uitnodiging beschikbaar. We werken met een beperkt aantal Nederlandse advocaten, juristen, in-house teams en kantoren die AI-ondersteund onderzoek op echte zaken willen beoordelen.",
      betaPartnerLine:
        "Design partners krijgen direct contact met het team, invloed op de roadmap en een product dat rond hun werkwijze wordt gevormd.",
      betaListTitle: "Voor wie",
      betaList: [
        "Nederlandse advocaten, juristen en paralegals in arbeidsrecht, huurrecht of bestuursrecht",
        "In-house legal teams met Nederlandse zaken",
        "Kantoren die AI-ondersteund onderzoek willen valideren voor productiegebruik",
      ],
      betaCta: "Beta-toegang aanvragen",
      titleLead: "Bekijk het met",
      titleAccent: "je eigen vragen.",
      description:
        "De snelste manier om Veridicta te beoordelen is een echte onderzoeksvraag meenemen en zien hoe het systeem daarmee omgaat. Walkthroughs worden door het team gegeven, duren ongeveer dertig minuten en eindigen met jouw oordeel of beta-toegang de moeite waard is.",
      primaryCta: "Beta-toegang aanvragen",
      secondaryCta: "Plan een walkthrough",
      tertiaryLine: "Of mail direct: hello@veridicta.nl",
    },
    footer: {
      description:
        "Veridicta ondersteunt juridisch onderzoek. Het geeft geen juridisch advies en vervangt geen professioneel juridisch oordeel. Output moet worden beoordeeld door een gekwalificeerde juridische professional voordat erop wordt vertrouwd.",
      betaDisclaimer:
        "Veridicta is in private beta. Functionaliteit, dekking en prestaties ontwikkelen zich. Dekking is momenteel beperkt tot geselecteerde Nederlandse rechtsgebieden.",
      rightsReserved: "Alle rechten voorbehouden.",
      legalLinks: ["Privacy", "Voorwaarden", "Contact"],
    },
  },
};

const localeSet = new Set<Locale>(supportedLocales.map(({ code }) => code));

export function isLocale(value: string | null | undefined): value is Locale {
  return value !== null && value !== undefined && localeSet.has(value as Locale);
}
