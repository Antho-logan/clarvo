import { proxyBackendJsonPost } from "@/lib/backend-proxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return proxyBackendJsonPost("/matters/research-notes", request);
}
