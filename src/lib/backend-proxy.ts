import "server-only";

import { createApiUrl } from "@/lib/api/base-url";
import { getBackendAuthToken } from "@/lib/server-auth-token";

type BackendPostOptions = {
  accept?: string;
  contentType?: string;
};

export async function postToBackend(
  path: string,
  body: BodyInit,
  options: BackendPostOptions = {},
) {
  const token = await getBackendAuthToken();
  const headers: Record<string, string> = {
    Accept: options.accept || "application/json",
    "Content-Type": options.contentType || "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(createApiUrl(path), {
    method: "POST",
    body,
    headers,
    cache: "no-store",
  });
}

export async function proxyBackendJsonPost(path: string, request: Request) {
  const backendResponse = await postToBackend(path, await request.text());

  return new Response(await backendResponse.text(), {
    status: backendResponse.status,
    headers: {
      "Content-Type":
        backendResponse.headers.get("Content-Type") || "application/json",
    },
  });
}
