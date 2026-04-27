import { createApiUrl } from "@/lib/api/base-url";
import { getBackendAuthToken } from "@/lib/server-auth-token";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = await getBackendAuthToken();
  const body = await request.text();
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const backendResponse = await fetch(createApiUrl("/agent/stream"), {
    method: "POST",
    body,
    headers,
    cache: "no-store",
  });

  if (!backendResponse.ok) {
    return new Response(await backendResponse.text(), {
      status: backendResponse.status,
      headers: {
        "Content-Type":
          backendResponse.headers.get("Content-Type") || "text/plain",
      },
    });
  }

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
