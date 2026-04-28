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
  embedding_status: string | null;
  created_at: string;
  updated_at: string;
};

export type SearchResult = {
  id: string;
  document_type: string;
  source_type: string | null;
  source_system: string | null;
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
  embedding_status: string | null;
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
  items_total?: number;
  items_done?: number;
  items_failed?: number;
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
  retry_count?: number;
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

export type WorkflowSummary = {
  id: string;
  name: string;
  domain: string;
  step_count: number;
  steps: string[];
};

export type WorkflowsResponse = {
  count: number;
  workflows: WorkflowSummary[];
};

export type Matter = {
  id: string;
  user_id: string;
  title: string;
  client: string | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
  rechtsgebied: string | null;
  description: string | null;
  tags: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MattersResponse = {
  count: number;
  matters: Matter[];
};

export type MatterResponse = {
  matter: Matter;
};

export type UserSettings = {
  user_id: string;
  display_name: string | null;
  firm_name: string | null;
  theme_preference: string;
  bwb_enabled: boolean;
  rechtspraak_enabled: boolean;
  openai_key_configured: boolean;
  cohere_key_configured: boolean;
  primary_domain: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type SettingsResponse = {
  settings: UserSettings;
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
  date_from?: string;
  date_to?: string;
};

export type MattersQuery = {
  q?: string;
  status?: string;
  rechtsgebied?: string;
  limit?: number;
};

export type AssistantCitation = {
  id: string | null;
  source_id: string | null;
  source_type: string | null;
  domain: string | null;
  title: string | null;
  article: string | null;
  section: string | null;
  court: string | null;
  decision_date: string | null;
  source_url: string | null;
  snippet: string;
};

export type AssistantResponse = {
  status: "grounded" | "insufficient_sources";
  answer: string;
  question: string;
  source_ids: string[];
  citations: AssistantCitation[];
  tool_trace: Array<Record<string, unknown>>;
};
