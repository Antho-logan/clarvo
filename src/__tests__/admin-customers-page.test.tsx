import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  listCustomers: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/admin-customers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin-customers")>(
    "@/lib/admin-customers",
  );
  return {
    ...actual,
    listCustomers: mocks.listCustomers,
  };
});

describe("admin customers page", () => {
  it("renders customer management for the owner", async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { email: "anthonylogan1995@gmail.com", name: "Anthony Logan" },
    });
    mocks.listCustomers.mockResolvedValueOnce([
      {
        id: "customer-1",
        email: "customer@example.com",
        name: "Customer",
        role: "Customer",
        createdAt: "2026-05-02T10:00:00Z",
      },
    ]);
    const { default: CustomersPage } = await import("@/app/admin/customers/page");

    render(await CustomersPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Customers" })).toBeInTheDocument();
    expect(screen.getByText("customer@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("redirects logged-out users to login", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    const { default: CustomersPage } = await import("@/app/admin/customers/page");

    await expect(
      CustomersPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NEXT_REDIRECT:/login?callbackUrl=/admin/customers");
  });

  it("redirects non-owner users to the dashboard", async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { email: "customer@example.com", name: "Customer" },
    });
    const { default: CustomersPage } = await import("@/app/admin/customers/page");

    await expect(
      CustomersPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");
  });
});
