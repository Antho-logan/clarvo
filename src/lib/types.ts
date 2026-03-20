export const SOURCE_TYPE_OPTIONS = [
  { value: "legislation", label: "Legislation" },
  { value: "case_law", label: "Case Law" },
] as const;

export const DOMAIN_OPTIONS = [
  { value: "tenancy_law", label: "Tenancy Law" },
  { value: "employment_law", label: "Employment Law" },
  { value: "administrative_law", label: "Administrative Law" },
  { value: "immigration_law", label: "Immigration Law" },
  { value: "sme_business_law", label: "SME Business Law" },
] as const;

export type SourceType = (typeof SOURCE_TYPE_OPTIONS)[number]["value"];
export type DomainKey = (typeof DOMAIN_OPTIONS)[number]["value"];

export type DocumentRecord = {
  id: string;
  document_type: string;
  source_type: string | null;
  source_system: string | null;
  source_id: string | null;
  domain: string | null;
  bwbr_id: string | null;
  ecli: string | null;
  title: string | null;
  article: string | null;
  section: string | null;
  court: string | null;
  decision_date: string | null;
  subject: string | null;
  effective_from: string;
  effective_to: string;
  text: string;
  source_url: string | null;
  fetched_at: string | null;
  parser_version: string | null;
  created_at: string;
  updated_at: string;
};

export type SearchResult = {
  id: string;
  document_type: string;
  source_type: string | null;
  source_id: string | null;
  domain: string | null;
  bwbr_id: string | null;
  ecli: string | null;
  article: string | null;
  section: string | null;
  title: string | null;
  court: string | null;
  decision_date: string | null;
  subject: string | null;
  text: string;
  source_url: string | null;
  score: number;
  source: string;
};

export type IngestionJob = {
  id: number;
  job_type: string;
  source_system: string;
  domain: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
  total_items: number;
  success_count: number;
  failure_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type IngestionJobItem = {
  id: number;
  job_id: number;
  source_type: string;
  source_system: string;
  source_identifier: string;
  domain: string | null;
  status: string;
  error_message: string | null;
  fetched_at: string | null;
  inserted_count: number | null;
  created_at: string;
  updated_at: string;
};

export type HealthResponse = {
  status: string;
};

export type DocumentsResponse = {
  count: number;
  documents: DocumentRecord[];
};

export type DocumentDetailResponse = {
  source_id: string;
  count: number;
  documents: DocumentRecord[];
};

export type SearchResponse = {
  query: string;
  count: number;
  results: SearchResult[];
};

export type IngestionJobsResponse = {
  count: number;
  jobs: IngestionJob[];
};

export type IngestionJobResponse = {
  job: IngestionJob;
  items: IngestionJobItem[];
};

export type DocumentsQuery = {
  limit?: number;
  source_type?: string;
  domain?: string;
};

export type SearchQuery = {
  q: string;
  limit?: number;
  source_type?: string;
  domain?: string;
};
