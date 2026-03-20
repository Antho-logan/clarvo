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
    return "Unassigned Domain";
  }
  return domainLabelMap.get(domain) || startCase(domain);
}

export function getSourceTypeLabel(sourceType?: string | null) {
  if (!sourceType) {
    return "Unknown Source";
  }
  return sourceTypeLabelMap.get(sourceType) || startCase(sourceType);
}

export function getDocumentHeading(record: LegalRecord) {
  return (
    record.title ||
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
    return `Article ${record.article} · Section ${record.section}`;
  }

  if (record.article) {
    return `Article ${record.article}`;
  }

  return `Section ${record.section}`;
}

export function getSearchScore(result: SearchResult) {
  return `${Math.round(result.score * 100)}% relevance`;
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
