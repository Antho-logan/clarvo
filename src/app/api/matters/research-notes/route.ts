import { createApiUrl } from "@/lib/api/base-url";
import { getBackendAuthToken } from "@/lib/server-auth-token";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = await getBackendAuthToken();
  const body = await request.text();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const backendResponse = await fetch(createApiUrl("/matters/research-notes"), {
    method: "POST",
    body,
    headers,
    cache: "no-store",
  });

  return new Response(await backendResponse.text(), {
    status: backendResponse.status,
    headers: {
      "Content-Type":
        backendResponse.headers.get("Content-Type") || "application/json",
    },
  });
}
