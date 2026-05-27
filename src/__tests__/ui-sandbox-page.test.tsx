import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: navigationMocks.notFound,
}));

describe("UI sandbox page", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    navigationMocks.notFound.mockClear();
    vi.resetModules();
  });

  it("is hidden in production unless explicitly enabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_UI_SANDBOX", "");
    const { default: UiSandboxPage } = await import(
      "@/app/dashboard/ui-sandbox/page"
    );

    expect(() => render(<UiSandboxPage />)).toThrow("NEXT_NOT_FOUND");
    expect(navigationMocks.notFound).toHaveBeenCalled();
  });

  it("remains available for local development", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ENABLE_UI_SANDBOX", "");
    const { default: UiSandboxPage } = await import(
      "@/app/dashboard/ui-sandbox/page"
    );

    render(<UiSandboxPage />);

    expect(screen.getByText("UI Sandbox")).toBeInTheDocument();
    expect(navigationMocks.notFound).not.toHaveBeenCalled();
  });
});
