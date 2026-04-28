import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const caseLawDocument = {
  id: "doc-1",
  document_type: "judgment",
  source_type: "case_law",
  source_system: null,
  source_id: "ECLI:NL:TEST:2026:1",
  domain: "tenancy_law",
  bwbr_id: null,
  ecli: "ECLI:NL:TEST:2026:1",
  title: "Huurrecht uitspraak",
  article: null,
  section: null,
  court: "Rechtbank",
  decision_date: "2026-04-19",
  subject: "huur",
  effective_from: "2026-04-19",
  effective_to: "9999-12-31",
  text: "Een previewtekst over een huurgeschil.",
  source_url: null,
  fetched_at: "2026-04-19T10:00:00",
  parser_version: "test",
  embedding_status: "completed",
  created_at: "2026-04-19T10:00:00",
  updated_at: "2026-04-19T10:00:00",
};

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {},
  getDocument: vi.fn(async () => ({
    source_id: caseLawDocument.source_id,
    count: 1,
    documents: [caseLawDocument],
  })),
  getDocuments: vi.fn(async () => ({
    count: 1,
    documents: [caseLawDocument],
  })),
  getIngestionJobs: vi.fn(async () => ({ count: 0, jobs: [] })),
  healthCheck: vi.fn(async () => ({ status: "ok" })),
}));

describe("documents source labels", () => {
  it("infers a readable source label and opens a deep-linked drawer", async () => {
    const { default: DocumentsPage } =
      await import("@/app/dashboard/documents/page");

    render(
      await DocumentsPage({
        searchParams: Promise.resolve({
          doc: "ECLI:NL:TEST:2026:1",
          domain: "tenancy_law",
          limit: "12",
        }),
      }),
    );

    expect(screen.getAllByText("Rechtspraak").length).toBeGreaterThan(0);
    expect(screen.queryByText("Unknown Source")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /preview document/i }),
    ).toHaveAttribute(
      "href",
      "/dashboard/documents?domain=tenancy_law&limit=12&doc=ECLI%3ANL%3ATEST%3A2026%3A1",
    );
    expect(screen.getByText("Document preview")).toBeInTheDocument();
    expect(
      screen.getAllByText("Een previewtekst over een huurgeschil.").length,
    ).toBeGreaterThan(0);
  });
});
