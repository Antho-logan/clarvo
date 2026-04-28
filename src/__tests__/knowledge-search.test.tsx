import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {},
  getIngestionJobs: vi.fn(async () => ({ count: 0, jobs: [] })),
  healthCheck: vi.fn(async () => ({ status: "ok" })),
  searchDocuments: vi.fn(async () => ({
    query: "huur",
    count: 1,
    results: [
      {
        id: "hit-1",
        document_type: "article",
        source_type: "case_law",
        source_id: "ECLI:NL:TEST:2026:1",
        domain: "tenancy_law",
        bwbr_id: null,
        ecli: "ECLI:NL:TEST:2026:1",
        article: null,
        section: null,
        title: "Huurrecht uitspraak",
        court: "Rechtbank",
        decision_date: "2026-04-19",
        subject: "huur",
        text: "Huurgeschil tussen huurder en verhuurder.",
        source_url: null,
        score: 1,
        source: "bm25",
      },
    ],
  })),
}));

describe("knowledge search", () => {
  it("renders search results for a happy-path query", async () => {
    const { default: KnowledgePage } =
      await import("@/app/dashboard/knowledge/page");

    render(
      await KnowledgePage({
        searchParams: Promise.resolve({ q: "huur", domain: "tenancy_law" }),
      }),
    );

    expect(screen.getByText("Knowledge Base")).toBeInTheDocument();
    expect(screen.getAllByText("Huurrecht uitspraak").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByText(/Huurgeschil tussen huurder/).length,
    ).toBeGreaterThan(0);
  });
});
