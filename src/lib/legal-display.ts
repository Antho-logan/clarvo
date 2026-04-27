import type {
  DocumentRecord,
  DomainKey,
  IngestionJob,
  SearchResult,
  SourceType,
} from "@/lib/types";

import { DOMAIN_OPTIONS, SOURCE_TYPE_OPTIONS } from "@/lib/types";

type LegalRecord = DocumentRecord | SearchResult;

const domainLabelMap = new Map<string, string>(
  DOMAIN_OPTIONS.map((option) => [option.value, option.label]),
);

const sourceTypeLabelMap = new Map<string, string>(
  SOURCE_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

export function getDomainLabel(domain?: string | null) {
  if (!domain) {
    return "Domain pending";
  }
  return domainLabelMap.get(domain) || startCase(domain);
}

export function getSourceTypeLabel(sourceType?: string | null) {
  if (!sourceType) {
    return "Stored source";
  }
  return sourceTypeLabelMap.get(sourceType) || startCase(sourceType);
}

export function getSourceSystemLabel(
  record: Pick<LegalRecord, "source_system" | "source_type">,
) {
  if (record.source_system) {
    const normalized = record.source_system.toLowerCase();
    if (normalized === "bwb" || normalized.includes("wetten")) {
      return "Overheid.nl";
    }
    if (normalized === "rechtspraak") {
      return "Rechtspraak";
    }
    return startCase(record.source_system);
  }

  if (record.source_type === "case_law") {
    return "Rechtspraak";
  }
  if (record.source_type === "legislation") {
    return "Overheid.nl";
  }
  return "Stored source";
}

export function getEmbeddingStatusBadge(status?: string | null) {
  if (status === "completed") {
    return {
      label: "Indexed",
      className: "text-emerald-700 border-emerald-200 bg-emerald-50",
    };
  }
  if (status === "stale") {
    return {
      label: "Re-indexing",
      className: "text-amber-700 border-amber-200 bg-amber-50",
    };
  }
  return null;
}

export function getDocumentHeading(record: LegalRecord) {
  const title = cleanLegalTitle(record.title);
  return (
    title ||
    record.ecli ||
    record.bwbr_id ||
    record.source_id ||
    "Untitled legal source"
  );
}

export function getSourceIdentifier(record: LegalRecord) {
  return record.source_id || record.ecli || record.bwbr_id || record.id;
}

export function getDocumentSnippet(text: string, maxLength = 240) {
  const compactText = text.replace(/\s+/g, " ").trim();
  if (!compactText) {
    return "No preview text is available for this stored row.";
  }

  if (compactText.length <= maxLength) {
    return compactText;
  }

  return `${compactText.slice(0, maxLength).trimEnd()}...`;
}

export function formatDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

export function getArticleLabel(record: LegalRecord) {
  if (!record.article && !record.section) {
    return null;
  }

  if (record.article && record.section) {
    return `Art. ${record.article} · lid ${record.section}`;
  }

  if (record.article) {
    return `Art. ${record.article}`;
  }

  return `Lid ${record.section}`;
}

export function getSearchScore(result: SearchResult) {
  const normalized = Math.max(0, Math.min(1, result.score));
  return `${Math.round(normalized * 100)}% relevance`;
}

export function getJobStatusTone(status: IngestionJob["status"]) {
  if (status === "completed") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "completed_with_errors") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (status === "running") {
    return "bg-[#DD3300]/10 text-[#DD3300] border-[#DD3300]/20";
  }

  return "bg-[#F5F5F4] text-[#63534B] border-[#D8D2C8]";
}

export function isValidDomain(value?: string | null): value is DomainKey {
  return DOMAIN_OPTIONS.some((option) => option.value === value);
}

export function isValidSourceType(value?: string | null): value is SourceType {
  return SOURCE_TYPE_OPTIONS.some((option) => option.value === value);
}

function startCase(value: string) {
  return value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanLegalTitle(value?: string | null) {
  if (!value) {
    return null;
  }
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return null;
  }
  if (/^ecli:nl:/i.test(compact)) {
    return compact.toUpperCase();
  }
  return compact
    .replace(/^wettenbank\s*[-:]\s*/i, "")
    .replace(/^regeling\s*[-:]\s*/i, "")
    .replace(/\s*\|\s*wetten\.nl\s*$/i, "");
}
