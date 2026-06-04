import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSettings } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {},
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

const mockedGetSettings = vi.mocked(getSettings);

describe("beta dashboard surfaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders workflows as an honest private-beta roadmap", async () => {
    const { default: WorkflowsPage } = await import(
      "@/app/dashboard/workflows/page"
    );

    render(await WorkflowsPage());

    expect(screen.getByText("Private beta roadmap")).toBeInTheDocument();
    expect(screen.getByText("Research memo workflow")).toBeInTheDocument();
    expect(screen.getByText("Document review workflow")).toBeInTheDocument();
    expect(screen.getByText("Citation audit workflow")).toBeInTheDocument();
    expect(
      screen.getByText("No workflow runner is active in this beta"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Document and legal review are available in Assistant/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not active autonomous runners/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/not yet generally available/i).length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText(/Analysis complete/i)).not.toBeInTheDocument();
  });

  it("renders settings as safe beta status and profile preferences", async () => {
    mockedGetSettings.mockResolvedValue({
      settings: {
        user_id: "test-user",
        display_name: "Test User",
        firm_name: "Test Firm",
        theme_preference: "system",
        language_preference: "nl",
        bwb_enabled: true,
        rechtspraak_enabled: true,
        openai_key_configured: true,
        cohere_key_configured: false,
        primary_domain: "tenancy_law",
        onboarding_completed: true,
        created_at: "2026-05-01T10:00:00Z",
        updated_at: "2026-05-01T10:00:00Z",
      },
    });
    const { default: SettingsPage } = await import(
      "@/app/dashboard/settings/page"
    );

    render(await SettingsPage());

    expect(screen.getByText("Private beta settings")).toBeInTheDocument();
    expect(screen.getByText("Beta status")).toBeInTheDocument();
    expect(screen.getByText("Corpus status")).toBeInTheDocument();
    expect(screen.getByText("Model status")).toBeInTheDocument();
    expect(screen.getByText("14,346 indexed")).toBeInTheDocument();
    expect(screen.getByText("Legal disclaimer")).toBeInTheDocument();
    expect(screen.getByLabelText("Dashboard language")).toBeInTheDocument();
    expect(screen.getByText("Save profile settings")).toBeInTheDocument();
    expect(screen.queryByText("API Keys")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/OPENAI_API_KEY/i)).not.toBeInTheDocument();
  });
});
