import { postToBackend } from "@/lib/backend-proxy";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set([
  ".csv",
  ".docx",
  ".md",
  ".markdown",
  ".pdf",
  ".txt",
]);
const SUPPORTED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/markdown",
  "text/plain",
]);

function getExtension(filename: string) {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex < 0) {
    return "";
  }
  return filename.slice(dotIndex).toLowerCase();
}

function isSupportedUpload(file: File) {
  const contentType = (file.type || "").split(";")[0]?.trim().toLowerCase();
  return (
    SUPPORTED_EXTENSIONS.has(getExtension(file.name)) ||
    SUPPORTED_CONTENT_TYPES.has(contentType) ||
    contentType.startsWith("text/")
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ detail: "Missing file upload." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { detail: "File is larger than the 10 MB upload limit." },
      { status: 413 },
    );
  }

  if (!isSupportedUpload(file)) {
    return Response.json(
      { detail: "Supported uploads are PDF, DOCX, TXT, Markdown, and CSV files." },
      { status: 415 },
    );
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
