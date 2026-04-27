import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {},
  getDocuments: vi.fn(async () => ({
    count: 1,
    documents: [
      {
        id: "doc-1",
        document_type: "article",
        source_type: "legislation",
        source_system: "bwb",
        source_id: "BWBR0005290",
        domain: "tenancy_law",
        bwbr_id: "BWBR0005290",
        ecli: null,
        title: "Burgerlijk Wetboek Boek 7",
        article: "7:204",
        section: null,
        court: null,
        decision_date: null,
        subject: null,
        effective_from: "1900-01-01",
        effective_to: "9999-12-31",
        text: "Huurrecht",
        source_url: null,
        fetched_at: null,
        parser_version: "test",
        created_at: "2026-04-19T00:00:00Z",
        updated_at: "2026-04-19T00:00:00Z",
      },
    ],
  })),
  getIngestionJobs: vi.fn(async () => ({ count: 0, jobs: [] })),
  getMatters: vi.fn(async () => ({ count: 0, matters: [] })),
  getSettings: vi.fn(async () => ({
    settings: {
      user_id: "test-user",
      display_name: null,
      firm_name: null,
      theme_preference: "system",
      bwb_enabled: true,
      rechtspraak_enabled: true,
      openai_key_configured: false,
      cohere_key_configured: false,
      primary_domain: "tenancy_law",
      onboarding_completed: true,
      created_at: "2026-04-19T00:00:00Z",
      updated_at: "2026-04-19T00:00:00Z",
    },
  })),
  getWorkflows: vi.fn(async () => ({
    count: 1,
    workflows: [
      {
        id: "matter_brief",
        name: "matter_brief",
        domain: "tenancy_law",
        step_count: 1,
        steps: [],
      },
    ],
  })),
  healthCheck: vi.fn(async () => ({ status: "ok" })),
}));

describe("dashboard home", () => {
  it("renders live dashboard data from the API wrapper", async () => {
    const { default: DashboardHome } = await import("@/app/dashboard/page");

    render(await DashboardHome());

    expect(screen.getByText("Burgerlijk Wetboek Boek 7")).toBeInTheDocument();
    expect(screen.getByText("Backend live")).toBeInTheDocument();
  });
});
