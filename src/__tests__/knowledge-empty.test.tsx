import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {},
  getIngestionJobs: vi.fn(async () => ({ count: 0, jobs: [] })),
  healthCheck: vi.fn(async () => ({ status: "ok" })),
  searchDocuments: vi.fn(async () => ({
    query: "zzzzgeenmatch",
    count: 0,
    results: [],
  })),
}));

describe("knowledge empty state", () => {
  it("renders the query, active domain, and broader-domain action", async () => {
    const { default: KnowledgePage } =
      await import("@/app/dashboard/knowledge/page");

    render(
      await KnowledgePage({
        searchParams: Promise.resolve({
          q: "zzzzgeenmatch",
          domain: "tenancy_law",
          limit: "8",
        }),
      }),
    );

    expect(
      screen.getByText('No matches for "zzzzgeenmatch" in Tenancy Law'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Try broader domain" }),
    ).toHaveAttribute("href", "/dashboard/knowledge?q=zzzzgeenmatch&limit=8");
  });
});
