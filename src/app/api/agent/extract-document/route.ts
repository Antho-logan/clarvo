import { postToBackend } from "@/lib/backend-proxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ detail: "Missing file upload." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const backendResponse = await postToBackend(
    "/agent/extract-document",
    JSON.stringify({
      filename: file.name,
      content_type: file.type || "application/octet-stream",
      data_base64: bytes.toString("base64"),
    }),
  );

  return new Response(await backendResponse.text(), {
    status: backendResponse.status,
    headers: {
      "Content-Type":
        backendResponse.headers.get("Content-Type") || "application/json",
    },
  });
}
