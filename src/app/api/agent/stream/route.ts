import { postToBackend } from "@/lib/backend-proxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const backendResponse = await postToBackend("/agent/stream", body, {
    accept: "text/event-stream",
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
