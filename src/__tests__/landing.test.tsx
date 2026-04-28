import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Hero } from "@/components/landing/Hero";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        function MotionComponent({
          children,
          ...props
        }: React.HTMLAttributes<HTMLElement>) {
          return React.createElement(tag, props, children);
        },
    },
  ),
}));

describe("landing hero", () => {
  it("renders the localized hero CTA", () => {
    render(
      <LanguageProvider>
        <Hero />
      </LanguageProvider>,
    );

    expect(
      screen.getByRole("button", { name: /request a demo/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /intelligence for dutch legal work/i,
      }),
    ).toBeInTheDocument();
  });
});
