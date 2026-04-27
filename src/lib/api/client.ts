import type {
  DocumentDetailResponse,
  DocumentsQuery,
  DocumentsResponse,
  AssistantResponse,
  HealthResponse,
  IngestionJobResponse,
  IngestionJobsResponse,
  MatterResponse,
  MattersQuery,
  MattersResponse,
  SearchQuery,
  SearchResponse,
  SettingsResponse,
  WorkflowsResponse,
} from "@/lib/types";
import { getBackendAuthToken } from "@/lib/server-auth-token";
import type { paths } from "@/lib/api/schema";
import { createApiUrl } from "@/lib/api/base-url";

type ApiPath = keyof paths;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseJsonResponse(response: Response) {
  const rawBody = await response.text();
  const body = rawBody ? safeJsonParse(rawBody) : {};

  if (!response.ok) {
    const errorMessage =
      extractErrorMessage(body) ||
      response.statusText ||
      "Backend request failed.";
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
    throw new ApiError(
      `Backend response is missing a valid '${key}' array.`,
      502,
    );
  }
  return value as T[];
}

function ensureNumber(value: unknown, key: string) {
  if (typeof value !== "number") {
    throw new ApiError(
      `Backend response is missing a valid '${key}' number.`,
      502,
    );
  }
  return value;
}

function ensureString(value: unknown, key: string) {
  if (typeof value !== "string") {
    throw new ApiError(
      `Backend response is missing a valid '${key}' string.`,
      502,
    );
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
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (!isRecord(item)) {
          return null;
        }
        const location = Array.isArray(item.loc) ? item.loc.join(".") : null;
        const message = typeof item.msg === "string" ? item.msg : null;
        return [location, message].filter(Boolean).join(": ");
      })
      .filter(Boolean)
      .join("; ");
  }

  const message = body.message;
  if (typeof message === "string") {
    return message;
  }

  return null;
}

async function apiFetch(
  path: ApiPath | string,
  params?: Record<string, string | number | undefined>,
  init?: RequestInit,
) {
  const token = await getBackendAuthToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((init?.headers || {}) as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(createUrl(path, params), {
    cache: "no-store",
    ...init,
    headers,
  });

  return parseJsonResponse(response);
}

function createUrl(
  path: ApiPath | string,
  params?: Record<string, string | number | undefined>,
) {
  return createApiUrl(String(path), params);
}

async function apiJsonFetch(
  path: ApiPath | string,
  init: RequestInit & { body?: BodyInit | null },
  params?: Record<string, string | number | undefined>,
) {
  return apiFetch(path, params, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export async function healthCheck(): Promise<HealthResponse> {
  const body = await apiFetch("/health");
  return {
    status: ensureString(body.status, "status"),
  };
}

export async function getDocuments(
  params: DocumentsQuery = {},
): Promise<DocumentsResponse> {
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
  const body = await apiFetch(
    `/documents/${encodeURIComponent(sourceId)}`,
    params,
  );
  return {
    source_id: ensureString(body.source_id, "source_id"),
    count: ensureNumber(body.count, "count"),
    documents: ensureArray(body.documents, "documents"),
  };
}

export async function searchDocuments(
  params: SearchQuery,
): Promise<SearchResponse> {
  const body = await apiFetch("/search", params);
  return {
    query: ensureString(body.query, "query"),
    count: ensureNumber(body.count, "count"),
    results: ensureArray(body.results, "results"),
  };
}

export async function askAssistant(payload: {
  question: string;
  domain?: string;
  max_iterations?: number;
}): Promise<AssistantResponse> {
  const body = await apiJsonFetch("/agent/chat", {
    method: "POST",
    body: JSON.stringify({
      question: payload.question,
      domain: payload.domain,
      max_iterations: payload.max_iterations ?? 2,
    }),
  });
  return body as AssistantResponse;
}

export async function getIngestionJobs(
  limit = 5,
): Promise<IngestionJobsResponse> {
  const body = await apiFetch("/ingestion/jobs", { limit });
  return {
    count: ensureNumber(body.count, "count"),
    jobs: ensureArray(body.jobs, "jobs"),
  };
}

export async function getIngestionJob(
  jobId: number,
): Promise<IngestionJobResponse> {
  const body = await apiFetch(`/ingestion/jobs/${jobId}`);
  if (!isRecord(body.job)) {
    throw new ApiError(
      "Backend response is missing a valid 'job' object.",
      502,
    );
  }

  return {
    job: body.job as IngestionJobResponse["job"],
    items: ensureArray(body.items, "items"),
  };
}

export async function getWorkflows(): Promise<WorkflowsResponse> {
  const body = await apiFetch("/workflows");
  return {
    count: ensureNumber(body.count, "count"),
    workflows: ensureArray(body.workflows, "workflows"),
  };
}

export async function getMatters(
  params: MattersQuery = {},
): Promise<MattersResponse> {
  const body = await apiFetch("/matters", params);
  return {
    count: ensureNumber(body.count, "count"),
    matters: ensureArray(body.matters, "matters"),
  };
}

export async function createMatter(
  payload: Record<string, unknown>,
): Promise<MatterResponse> {
  const body = await apiJsonFetch("/matters", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!isRecord(body.matter)) {
    throw new ApiError(
      "Backend response is missing a valid 'matter' object.",
      502,
    );
  }
  return { matter: body.matter as MatterResponse["matter"] };
}

export async function updateMatter(
  matterId: string,
  payload: Record<string, unknown>,
): Promise<MatterResponse> {
  const body = await apiJsonFetch(`/matters/${matterId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!isRecord(body.matter)) {
    throw new ApiError(
      "Backend response is missing a valid 'matter' object.",
      502,
    );
  }
  return { matter: body.matter as MatterResponse["matter"] };
}

export async function archiveMatter(matterId: string): Promise<void> {
  await apiJsonFetch(`/matters/${matterId}`, {
    method: "DELETE",
  });
}

export async function getSettings(): Promise<SettingsResponse> {
  const body = await apiFetch("/settings");
  if (!isRecord(body.settings)) {
    throw new ApiError(
      "Backend response is missing a valid 'settings' object.",
      502,
    );
  }
  return { settings: body.settings as SettingsResponse["settings"] };
}

export async function updateSettings(
  payload: Record<string, unknown>,
): Promise<SettingsResponse> {
  const body = await apiJsonFetch("/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!isRecord(body.settings)) {
    throw new ApiError(
      "Backend response is missing a valid 'settings' object.",
      502,
    );
  }
  return { settings: body.settings as SettingsResponse["settings"] };
}
