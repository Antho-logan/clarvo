export function getApiBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!configuredBaseUrl && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required in production.");
  }

  const baseUrl = configuredBaseUrl || "http://127.0.0.1:8000";

  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

export function createApiUrl(
  path: string,
  params?: Record<string, string | number | undefined>,
) {
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
