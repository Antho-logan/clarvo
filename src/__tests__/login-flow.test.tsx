import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

vi.mock("@/app/login/actions", () => ({
  credentialsSignIn: vi.fn(),
  magicLinkSignIn: vi.fn(),
}));

describe("login flow", () => {
  it("renders magic-link entry and check-email confirmation", async () => {
    const { default: LoginPage } = await import("@/app/login/page");
    const { default: CheckEmailPage } =
      await import("@/app/login/check-email/page");

    render(
      await LoginPage({
        searchParams: Promise.resolve({ callbackUrl: "/dashboard" }),
      }),
    );

    expect(
      screen.getByRole("button", { name: /send magic link/i }),
    ).toBeInTheDocument();

    render(<CheckEmailPage />);

    expect(screen.getByText("Check your email")).toBeInTheDocument();
    expect(
      screen.getByText(/a sign-in link is on its way/i),
    ).toBeInTheDocument();
  });
});
