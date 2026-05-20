import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { DashboardShell } from "@/components/dashboard/DashboardShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("dashboard navigation", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  it("keeps development-only UI sandbox out of normal navigation", () => {
    render(
      <DashboardShell
        user={{ name: "Demo User", email: "demo@veridicta.local" }}
        signOutAction={async () => {}}
      >
        <p>Dashboard content</p>
      </DashboardShell>,
    );

    expect(screen.getByText("Assistant")).toBeInTheDocument();
    expect(screen.getByText("Matters")).toBeInTheDocument();
    expect(screen.queryByText("UI Sandbox")).not.toBeInTheDocument();
  });

  it("keeps development-only UI sandbox out of command navigation", () => {
    render(
      <DashboardShell
        user={{ name: "Demo User", email: "demo@veridicta.local" }}
        signOutAction={async () => {}}
      >
        <p>Dashboard content</p>
      </DashboardShell>,
    );

    fireEvent.click(screen.getByText("Search or jump to…"));

    expect(screen.getByText("Navigate")).toBeInTheDocument();
    expect(screen.getAllByText("Assistant").length).toBeGreaterThan(0);
    expect(screen.queryByText("UI Sandbox")).not.toBeInTheDocument();
  });
});
