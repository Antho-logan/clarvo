import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMatters } from "@/lib/api/client";
import type { Matter } from "@/lib/types";

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {},
  getMatters: vi.fn(),
}));

const mockedGetMatters = vi.mocked(getMatters);

function makeMatter(overrides: Partial<Matter> = {}): Matter {
  return {
    id: "matter-1",
    user_id: "test-user",
    title: "Demo Matter",
    client: "Veridicta demo",
    status: "active",
    opened_at: "2026-05-01",
    closed_at: null,
    rechtsgebied: "tenancy_law",
    description: "Saved assistant research notes.",
    tags: {},
    created_at: "2026-05-01T10:00:00Z",
    updated_at: "2026-05-01T10:00:00Z",
    ...overrides,
  };
}

function researchNote(overrides: Record<string, unknown> = {}) {
  return {
    id: "note-1",
    type: "assistant_research_note",
    matter_id: "matter-1",
    matter_title: "Demo Matter",
    question: "Wat geldt bij opzegging van huur van woonruimte?",
    answer:
      "Bij opzegging van huur van woonruimte gelden specifieke termijnen en waarborgen.",
    status: "grounded",
    source_ids: ["BWBR0005290"],
    citations: [
      {
        id: "doc-1",
        source_id: "BWBR0005290",
        source_type: "legislation",
        domain: "tenancy_law",
        title: "Burgerlijk Wetboek Boek 7",
        article: "7:271",
        section: null,
        court: null,
        decision_date: null,
        source_url: null,
        snippet: "Opzegging huur.",
      },
    ],
    citation_count: 1,
    domains: ["tenancy_law"],
    created_at: "2026-05-06T23:06:07.619Z",
    ...overrides,
  };
}

describe("matters page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders saved research notes with citation count and source trail", async () => {
    mockedGetMatters.mockResolvedValue({
      count: 1,
      matters: [
        makeMatter({
          tags: {
            research_notes: [researchNote()],
          },
        }),
      ],
    });
    const { default: MattersPage } = await import("@/app/dashboard/matters/page");

    render(await MattersPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Saved research")).toBeInTheDocument();
    expect(
      screen.getAllByText("Wat geldt bij opzegging van huur van woonruimte?")
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Bij opzegging van huur van woonruimte gelden specifieke termijnen en waarborgen.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("1 citation").length).toBeGreaterThan(0);
    expect(screen.getByText(/BWBR0005290 · Art. 7:271/)).toBeInTheDocument();
    expect(screen.getAllByText("Tenancy Law").length).toBeGreaterThan(0);
  });

  it("renders an empty research state when a matter has no notes", async () => {
    mockedGetMatters.mockResolvedValue({
      count: 1,
      matters: [makeMatter()],
    });
    const { default: MattersPage } = await import("@/app/dashboard/matters/page");

    render(await MattersPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("No saved research yet")).toBeInTheDocument();
    expect(screen.getByText("Open Assistant")).toBeInTheDocument();
    expect(
      screen.getByText(/Ask a grounded legal question in the Assistant/),
    ).toBeInTheDocument();
  });

  it("ignores malformed saved research instead of crashing", async () => {
    mockedGetMatters.mockResolvedValue({
      count: 1,
      matters: [
        makeMatter({
          tags: {
            research_notes: [
              {
                id: "bad-note",
                type: "assistant_research_note",
                question: "Incomplete note",
                answer: "Missing citations should be ignored.",
              },
            ],
          },
        }),
      ],
    });
    const { default: MattersPage } = await import("@/app/dashboard/matters/page");

    render(await MattersPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("No saved research yet")).toBeInTheDocument();
    expect(screen.queryByText("Incomplete note")).not.toBeInTheDocument();
  });

  it("renders the no-matters workspace empty state", async () => {
    mockedGetMatters.mockResolvedValue({ count: 0, matters: [] });
    const { default: MattersPage } = await import("@/app/dashboard/matters/page");

    render(await MattersPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByText(/No matters matched the current filters/),
    ).toBeInTheDocument();
    expect(screen.getByText("No matter selected")).toBeInTheDocument();
    expect(screen.getByText("Create Matter")).toBeInTheDocument();
  });
});
