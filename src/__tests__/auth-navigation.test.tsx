import { render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  signOut: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
  signOut: mocks.signOut,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/api/client", () => ({
  getSettings: vi.fn(async () => ({
    settings: {
      language_preference: "nl",
    },
  })),
}));

let capturedSignOutAction: null | (() => Promise<void>) = null;

vi.mock("@/components/dashboard/DashboardShell", () => ({
  DashboardShell: ({
    children,
    signOutAction,
  }: {
    children: React.ReactNode;
    signOutAction: () => Promise<void>;
  }) => {
    capturedSignOutAction = signOutAction;
    return <div>{children}</div>;
  },
}));

describe("auth navigation", () => {
  const originalDevBypass = process.env.AUTH_DEV_BYPASS;

  afterEach(() => {
    process.env.AUTH_DEV_BYPASS = originalDevBypass;
    capturedSignOutAction = null;
    vi.clearAllMocks();
  });

  it("uses a demo user locally when dev bypass is enabled", async () => {
    process.env.AUTH_DEV_BYPASS = "true";
    const { default: DashboardLayout } = await import("@/app/dashboard/layout");

    render(await DashboardLayout({ children: <p>Dashboard content</p> }));

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("requires auth when dev bypass is disabled", async () => {
    process.env.AUTH_DEV_BYPASS = "false";
    mocks.auth.mockResolvedValueOnce(null);
    const { default: DashboardLayout } = await import("@/app/dashboard/layout");

    await expect(
      DashboardLayout({ children: <p>Dashboard content</p> }),
    ).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("signs out to the public landing page", async () => {
    process.env.AUTH_DEV_BYPASS = "false";
    mocks.auth.mockResolvedValueOnce({
      user: { name: "Beta User", email: "beta@example.com", image: null },
    });
    const { default: DashboardLayout } = await import("@/app/dashboard/layout");

    render(await DashboardLayout({ children: <p>Dashboard content</p> }));
    await capturedSignOutAction?.();

    expect(mocks.signOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });

  it("returns to the public landing page on local bypass sign-out", async () => {
    process.env.AUTH_DEV_BYPASS = "true";
    const { default: DashboardLayout } = await import("@/app/dashboard/layout");

    render(await DashboardLayout({ children: <p>Dashboard content</p> }));

    await expect(capturedSignOutAction?.()).rejects.toThrow("NEXT_REDIRECT:/");
  });
});
