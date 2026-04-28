export const supportedLocales = [
  { code: "en", label: "English" },
  { code: "nl", label: "Nederlands" },
] as const;

export type Locale = (typeof supportedLocales)[number]["code"];

export const defaultLocale: Locale = "en";

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
    resultCards: string[];
  };
  features: {
    items: Array<{
      title: string;
      description: string;
      bullets: string[];
    }>;
    exploreWorkflow: string;
    analysisComplete: string;
    analysisSummary: string;
  };
  metrics: {
    stats: Array<{
      label: string;
      value: string;
    }>;
  };
  caseStudies: {
    titleLead: string;
    titleAccent: string;
    subtitle: string;
    testimonials: Array<{
      quote: string;
      author: string;
      title: string;
      firm: string;
    }>;
  };
  security: {
    badge: string;
    titleLead: string;
    titleAccent: string;
    description: string;
    compliances: Array<{
      title: string;
      desc: string;
    }>;
  };
  cta: {
    titleLead: string;
    titleAccent: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };
  footer: {
    description: string;
    columns: Array<{
      title: string;
      links: string[];
    }>;
    rightsReserved: string;
    legalLinks: [string, string, string];
  };
};

export const landingCopy: Record<Locale, LandingCopy> = {
  en: {
    header: {
      nav: {
        workflows: "Workflows",
        practiceAreas: "Practice Areas",
        security: "Security",
        company: "Company",
      },
      login: "Login",
      requestDemo: "Request Demo",
      languageLabel: "Language",
    },
    hero: {
      banner: "Dutch & EU Legal Intelligence is now live",
      titleLead: "Intelligence for",
      titleAccent: "Dutch Legal Work.",
      description:
        "Accelerate research, draft with context, and run structured workflows across your matters. Source-backed AI built for serious legal practitioners.",
      primaryCta: "Request a Demo",
      secondaryCta: "Explore Platform",
      panelLabel: "Matter Analysis",
      riskBadge: "Risk Identified",
      lawBadge: "German Law",
      panelAction: "View Details",
      trustStrip: [
        "Grounded in Dutch & EU Law",
        "Private by Design",
        "Built for MKB & Legal Professionals",
      ],
    },
    valueProp: {
      eyebrow: "Core Capabilities",
      titleLead: "Built for Legal Reality.",
      titleAccent: "Not General Chat.",
      description:
        "Veridicta transforms how premium legal teams handle complex analysis. Upload case files and let our agentic architecture run structured, traceable workflows that accelerate your judgment.",
      pillars: [
        {
          title: "Structured Workflows",
          description:
            "Run standardized, repeatable analyses on contracts, appeals, and dossiers based on Dutch legal frameworks.",
        },
        {
          title: "Matter Intelligence",
          description:
            "Keep documents, research, chronologies, and generated memos organized strictly within the context of the case.",
        },
        {
          title: "Source-Backed Assistant",
          description:
            "Query your documents and our curated Dutch & EU legal databases with full citation traceability. Zero hallucinations.",
        },
        {
          title: "Document Vault",
          description:
            "Securely upload and categorize contracts, evidence files, and rulings to build an instant knowledge base.",
        },
      ],
      discoverCapability: "Discover capability",
    },
    productDemo: {
      eyebrow: "Interactive Agents",
      titleLead: "The power of an associate.",
      titleAccent: "The speed of compute.",
      description:
        "Orchestrate complex legal reviews in natural language across your firm's entire corpus of knowledge and European law.",
      matterBadge: "Matter: Project Orion",
      languageBadge: "Language: EN / NL",
      prompt: {
        beforeLaw:
          "Review the attached Orion supply agreement, identify termination risks under ",
        highlightedLaw: "Dutch and German law",
        between:
          ", summarize the most material negotiation points, and draft a ",
        highlightedDeliverable: "client-ready memo in English and Dutch",
        after: ".",
      },
      chips: [
        "Contracts",
        "EU Legislation",
        "Court Filings",
        "Internal Policies",
        "Case Notes",
      ],
      primaryCta: "Analyze Matter",
      resultCards: [
        "Risk Summary",
        "Cross-Border Notes",
        "Draft Memo Ready",
        "Citations Included",
      ],
    },
    features: {
      items: [
        {
          title: "Arbeidsrecht & Huurrecht Workflow Analysis",
          description:
            "Standardize contract reviews. Instantly detect non-compliant termination clauses, service fee disputes, and employer obligations against current Dutch law and jurisprudence.",
          bullets: [
            "Clause Detection",
            "Risk Matrix Generation",
            "Jurisprudence Matching",
          ],
        },
        {
          title: "Bestuursrecht & Bezwaar Preparation",
          description:
            "Transform municipal decisions into structured appeal chronologies. Veridicta automatically extracts procedural deadlines and identifies missing evidence in your dossier.",
          bullets: [
            "Deadline Extraction",
            "Timeline Building",
            "Dossier Triage",
          ],
        },
        {
          title: "MKB Corporate & Vreemdelingenrecht",
          description:
            "Automate heavy compliance lifting. Scan supplier contracts for uncapped liabilities, or verify residence permit applications against required document checklists in seconds.",
          bullets: [
            "Liability Scanning",
            "Verification Checklists",
            "Next-Step Guidance",
          ],
        },
      ],
      exploreWorkflow: "Explore Workflow",
      analysisComplete: "Analysis Complete",
      analysisSummary: "7 key risks identified across 450 pages.",
    },
    metrics: {
      stats: [
        { label: "Hours saved per month\nper lawyer", value: "20+" },
        { label: "Matters accelerated\nacross the EU", value: "1,000+" },
        { label: "Major European\nlanguages supported", value: "6" },
        { label: "Platform uptime for\nenterprise SLA", value: "99.9%" },
      ],
    },
    caseStudies: {
      titleLead: "Relied upon by",
      titleAccent: "the vanguard",
      subtitle: "What leading European legal teams are saying.",
      testimonials: [
        {
          quote:
            "Veridicta fundamentally changed our intake speed. We use it across cross-border M&A deals to synthesize 100+ documents overnight.",
          author: "Helena Rostova",
          title: "Managing Partner",
          firm: "Rostova & Partners LLP",
        },
        {
          quote:
            "Finally, a platform that understands legal nuance across four different languages. It feels like an elite extension of our associates.",
          author: "Julien Vasseur",
          title: "General Counsel",
          firm: "Lumiere Holdings",
        },
        {
          quote:
            "The ability to compare contract risk profiles instantly against European benchmark legislation has saved us roughly 500 hours this quarter.",
          author: "Markus Becker",
          title: "Head of Legal Operations",
          firm: "Becker Law Group",
        },
      ],
    },
    security: {
      badge: "Bank-Grade Security",
      titleLead: "Compliance built for",
      titleAccent: "law firm procurement.",
      description:
        "Veridicta does not train models on your client data. We use zero-retention APIs and offer explicit data residency guarantees across Europe. Auditable, role-based, and secure by default.",
      compliances: [
        {
          title: "GDPR Ready",
          desc: "Built inside the EU for EU legal teams.",
        },
        {
          title: "ISO 27001",
          desc: "Certified information security management.",
        },
        {
          title: "Data Residency",
          desc: "Your data stays in Frankfurt, Paris, or localized regions.",
        },
        {
          title: "SOC 2 Type II",
          desc: "Audited controls for maximum enterprise security.",
        },
      ],
    },
    cta: {
      titleLead: "Stop Chatting.",
      titleAccent: "Start Running Workflows.",
      description:
        "Transform how your firm handles Huurrecht, Arbeidsrecht, and Bestuursrecht. Give your lawyers the intelligence, structure, and traceability they need.",
      primaryCta: "Explore Platform",
      secondaryCta: "See Practice Areas",
    },
    footer: {
      description:
        "Professional-grade legal AI for Europe’s leading firms. Built for work that demands precision and trust.",
      columns: [
        {
          title: "Platform",
          links: [
            "Contract Analysis",
            "Legal Research",
            "Multilingual Workflows",
            "AI Agents",
          ],
        },
        {
          title: "Solutions",
          links: [
            "For Law Firms",
            "For In-House Counsel",
            "Cross-Border Teams",
            "Compliance & Risk",
          ],
        },
        {
          title: "Security",
          links: [
            "GDPR Readiness",
            "ISO 27001",
            "Data Residency",
            "Trust Center",
          ],
        },
        {
          title: "Company",
          links: ["About Us", "Careers", "Press", "Contact"],
        },
      ],
      rightsReserved: "All rights reserved.",
      legalLinks: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
    },
  },
  nl: {
    header: {
      nav: {
        workflows: "Workflows",
        practiceAreas: "Rechtsgebieden",
        security: "Beveiliging",
        company: "Over ons",
      },
      login: "Inloggen",
      requestDemo: "Demo aanvragen",
      languageLabel: "Taal",
    },
    hero: {
      banner: "Nederlandse en EU-juridische intelligence is nu live",
      titleLead: "Intelligentie voor",
      titleAccent: "Nederlands juridisch werk.",
      description:
        "Versnel onderzoek, stel concepten op met context en voer gestructureerde workflows uit over al je dossiers. Brongebouwde AI voor serieuze juridische professionals.",
      primaryCta: "Demo aanvragen",
      secondaryCta: "Platform verkennen",
      panelLabel: "Zaakanalyse",
      riskBadge: "Risico gevonden",
      lawBadge: "Duits recht",
      panelAction: "Bekijk details",
      trustStrip: [
        "Gebaseerd op Nederlands en EU-recht",
        "Privacy by design",
        "Gebouwd voor mkb en juridische professionals",
      ],
    },
    valueProp: {
      eyebrow: "Kernmogelijkheden",
      titleLead: "Gebouwd voor de juridische praktijk.",
      titleAccent: "Niet voor algemene chat.",
      description:
        "Veridicta verandert hoe hoogwaardige juridische teams complexe analyses uitvoeren. Upload zaakdossiers en laat onze agentische architectuur gestructureerde, herleidbare workflows draaien die jouw oordeel versnellen.",
      pillars: [
        {
          title: "Gestructureerde workflows",
          description:
            "Voer gestandaardiseerde, herhaalbare analyses uit op contracten, bezwaren en dossiers op basis van Nederlandse juridische kaders.",
        },
        {
          title: "Zaakintelligentie",
          description:
            "Houd documenten, onderzoek, tijdlijnen en gegenereerde memo’s strikt georganiseerd binnen de context van de zaak.",
        },
        {
          title: "Bronverifieerde assistent",
          description:
            "Doorzoek je documenten en onze samengestelde Nederlandse en EU-juridische databronnen met volledige bronverantwoording. Geen hallucinaties.",
        },
        {
          title: "Documentkluis",
          description:
            "Upload en categoriseer contracten, bewijsstukken en uitspraken veilig om direct een bruikbare kennisbasis op te bouwen.",
        },
      ],
      discoverCapability: "Ontdek deze mogelijkheid",
    },
    productDemo: {
      eyebrow: "Interactieve agents",
      titleLead: "De kracht van een medewerker.",
      titleAccent: "De snelheid van compute.",
      description:
        "Orkestreer complexe juridische reviews in natuurlijke taal over de volledige kennisbasis van je kantoor en Europese wetgeving.",
      matterBadge: "Zaak: Project Orion",
      languageBadge: "Taal: EN / NL",
      prompt: {
        beforeLaw:
          "Beoordeel de bijgevoegde Orion-leveringsovereenkomst, identificeer beëindigingsrisico’s onder ",
        highlightedLaw: "Nederlands en Duits recht",
        between:
          ", vat de belangrijkste onderhandelingspunten samen en stel een ",
        highlightedDeliverable: "cliëntklare memo in het Engels en Nederlands",
        after: " op.",
      },
      chips: [
        "Contracten",
        "EU-wetgeving",
        "Processtukken",
        "Interne beleidsstukken",
        "Zaaknotities",
      ],
      primaryCta: "Zaak analyseren",
      resultCards: [
        "Risicosamenvatting",
        "Grensoverschrijdende notities",
        "Conceptmemo gereed",
        "Bronverwijzingen inbegrepen",
      ],
    },
    features: {
      items: [
        {
          title: "Workflowanalyse voor Arbeidsrecht en Huurrecht",
          description:
            "Standaardiseer contractreviews. Detecteer direct niet-conforme beëindigingsclausules, servicekostengeschillen en werkgeversverplichtingen aan de hand van actuele Nederlandse wetgeving en jurisprudentie.",
          bullets: [
            "Clausuledetectie",
            "Risicomatrixgeneratie",
            "Jurisprudentiematching",
          ],
        },
        {
          title: "Bestuursrecht en voorbereiding van bezwaar",
          description:
            "Zet gemeentelijke besluiten om in gestructureerde bezwaarchronologieën. Veridicta haalt automatisch procedurele termijnen uit documenten en signaleert ontbrekend bewijs in je dossier.",
          bullets: [
            "Deadline-extractie",
            "Tijdlijnopbouw",
            "Dossiertriage",
          ],
        },
        {
          title: "MKB-ondernemingsrecht en vreemdelingenrecht",
          description:
            "Automatiseer zwaar compliancewerk. Scan leverancierscontracten op onbeperkte aansprakelijkheid of controleer verblijfsvergunningsaanvragen in seconden aan de hand van vereiste documentchecklists.",
          bullets: [
            "Aansprakelijkheidsscan",
            "Verificatiechecklists",
            "Volgende-stap advies",
          ],
        },
      ],
      exploreWorkflow: "Bekijk workflow",
      analysisComplete: "Analyse voltooid",
      analysisSummary: "7 kernrisico’s gevonden in 450 pagina’s.",
    },
    metrics: {
      stats: [
        { label: "Uren bespaard per maand\nper jurist", value: "20+" },
        { label: "Versnelde zaken\nbinnen de EU", value: "1.000+" },
        { label: "Ondersteunde grote\nEuropese talen", value: "6" },
        { label: "Platformbeschikbaarheid\nvoor enterprise SLA", value: "99,9%" },
      ],
    },
    caseStudies: {
      titleLead: "Vertrouwd door",
      titleAccent: "de voorhoede",
      subtitle: "Wat toonaangevende Europese juridische teams zeggen.",
      testimonials: [
        {
          quote:
            "Veridicta heeft onze intakesnelheid fundamenteel veranderd. We gebruiken het bij grensoverschrijdende M&A-deals om in één nacht meer dan 100 documenten te synthetiseren.",
          author: "Helena Rostova",
          title: "Managing Partner",
          firm: "Rostova & Partners LLP",
        },
        {
          quote:
            "Eindelijk een platform dat juridische nuance begrijpt in vier verschillende talen. Het voelt als een eliteverlengstuk van onze medewerkers.",
          author: "Julien Vasseur",
          title: "General Counsel",
          firm: "Lumiere Holdings",
        },
        {
          quote:
            "De mogelijkheid om contractrisicoprofielen direct te vergelijken met Europese benchmarkwetgeving heeft ons dit kwartaal ongeveer 500 uur bespaard.",
          author: "Markus Becker",
          title: "Head of Legal Operations",
          firm: "Becker Law Group",
        },
      ],
    },
    security: {
      badge: "Beveiliging op bankniveau",
      titleLead: "Compliance gebouwd voor",
      titleAccent: "de procurement van advocatenkantoren.",
      description:
        "Veridicta traint geen modellen op cliëntdata. We gebruiken zero-retention API’s en bieden expliciete garanties voor dataresidentie binnen Europa. Auditbaar, rolgebaseerd en standaard veilig.",
      compliances: [
        {
          title: "AVG-klaar",
          desc: "Gebouwd binnen de EU voor Europese juridische teams.",
        },
        {
          title: "ISO 27001",
          desc: "Gecertificeerd informatiebeveiligingsmanagement.",
        },
        {
          title: "Dataresidentie",
          desc: "Je data blijft in Frankfurt, Parijs of andere gelokaliseerde regio’s.",
        },
        {
          title: "SOC 2 Type II",
          desc: "Geauditeerde controls voor maximale enterprise-beveiliging.",
        },
      ],
    },
    cta: {
      titleLead: "Stop met chatten.",
      titleAccent: "Start met workflows draaien.",
      description:
        "Verander hoe je kantoor omgaat met Huurrecht, Arbeidsrecht en Bestuursrecht. Geef je juristen de intelligentie, structuur en herleidbaarheid die ze nodig hebben.",
      primaryCta: "Platform verkennen",
      secondaryCta: "Bekijk rechtsgebieden",
    },
    footer: {
      description:
        "Juridische AI op professioneel niveau voor de leidende kantoren van Europa. Gebouwd voor werk dat precisie en vertrouwen vereist.",
      columns: [
        {
          title: "Platform",
          links: [
            "Contractanalyse",
            "Juridisch onderzoek",
            "Meertalige workflows",
            "AI-agents",
          ],
        },
        {
          title: "Oplossingen",
          links: [
            "Voor advocatenkantoren",
            "Voor bedrijfsjuristen",
            "Voor grensoverschrijdende teams",
            "Compliance en risico",
          ],
        },
        {
          title: "Beveiliging",
          links: [
            "AVG-gereedheid",
            "ISO 27001",
            "Dataresidentie",
            "Trust Center",
          ],
        },
        {
          title: "Bedrijf",
          links: ["Over ons", "Careers", "Pers", "Contact"],
        },
      ],
      rightsReserved: "Alle rechten voorbehouden.",
      legalLinks: ["Privacybeleid", "Gebruiksvoorwaarden", "Cookiebeleid"],
    },
  },
};

const localeSet = new Set<Locale>(supportedLocales.map(({ code }) => code));

export function isLocale(value: string | null | undefined): value is Locale {
  return value !== null && value !== undefined && localeSet.has(value as Locale);
}
