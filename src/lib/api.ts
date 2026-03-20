import type {
  DocumentDetailResponse,
  DocumentsQuery,
  DocumentsResponse,
  HealthResponse,
  IngestionJobResponse,
  IngestionJobsResponse,
  SearchQuery,
  SearchResponse,
} from "@/lib/types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getApiBaseUrl() {
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://127.0.0.1:8000";

  return configuredBaseUrl.endsWith("/")
    ? configuredBaseUrl
    : `${configuredBaseUrl}/`;
}

function createUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(path.replace(/^\//, ""), getApiBaseUrl());

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === "") {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function parseJsonResponse(response: Response) {
  const rawBody = await response.text();
  const body = rawBody ? safeJsonParse(rawBody) : {};

  if (!response.ok) {
    const errorMessage = extractErrorMessage(body) || response.statusText || "Backend request failed.";
    throw new ApiError(errorMessage, response.status);
  }

  if (!isRecord(body)) {
    throw new ApiError("Backend returned malformed JSON.", response.status);
  }

  return body;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    throw new ApiError("Backend returned invalid JSON.", 502);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureArray<T>(value: unknown, key: string) {
  if (!Array.isArray(value)) {
    throw new ApiError(`Backend response is missing a valid '${key}' array.`, 502);
  }
  return value as T[];
}

function ensureNumber(value: unknown, key: string) {
  if (typeof value !== "number") {
    throw new ApiError(`Backend response is missing a valid '${key}' number.`, 502);
  }
  return value;
}

function ensureString(value: unknown, key: string) {
  if (typeof value !== "string") {
    throw new ApiError(`Backend response is missing a valid '${key}' string.`, 502);
  }
  return value;
}

function extractErrorMessage(body: unknown) {
  if (!isRecord(body)) {
    return null;
  }

  const detail = body.detail;
  if (typeof detail === "string") {
    return detail;
  }

  const message = body.message;
  if (typeof message === "string") {
    return message;
  }

  return null;
}

async function apiFetch(path: string, params?: Record<string, string | number | undefined>) {
  const response = await fetch(createUrl(path, params), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  return parseJsonResponse(response);
}

export async function healthCheck(): Promise<HealthResponse> {
  const body = await apiFetch("/health");
  return {
    status: ensureString(body.status, "status"),
  };
}

export async function getDocuments(params: DocumentsQuery = {}): Promise<DocumentsResponse> {
  const body = await apiFetch("/documents", params);
  return {
    count: ensureNumber(body.count, "count"),
    documents: ensureArray(body.documents, "documents"),
  };
}

export async function getDocument(
  sourceId: string,
  params: Omit<DocumentsQuery, "limit" | "source_type"> = {},
): Promise<DocumentDetailResponse> {
  const body = await apiFetch(`/documents/${encodeURIComponent(sourceId)}`, params);
  return {
    source_id: ensureString(body.source_id, "source_id"),
    count: ensureNumber(body.count, "count"),
    documents: ensureArray(body.documents, "documents"),
  };
}

export async function searchDocuments(params: SearchQuery): Promise<SearchResponse> {
  const body = await apiFetch("/search", params);
  return {
    query: ensureString(body.query, "query"),
    count: ensureNumber(body.count, "count"),
    results: ensureArray(body.results, "results"),
  };
}

export async function getIngestionJobs(limit = 5): Promise<IngestionJobsResponse> {
  const body = await apiFetch("/ingestion/jobs", { limit });
  return {
    count: ensureNumber(body.count, "count"),
    jobs: ensureArray(body.jobs, "jobs"),
  };
}

export async function getIngestionJob(jobId: number): Promise<IngestionJobResponse> {
  const body = await apiFetch(`/ingestion/jobs/${jobId}`);
  if (!isRecord(body.job)) {
    throw new ApiError("Backend response is missing a valid 'job' object.", 502);
  }

  return {
    job: body.job as IngestionJobResponse["job"],
    items: ensureArray(body.items, "items"),
  };
}
