import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApprovedStaticLanding } from "@/components/landing/ApprovedStaticLanding";

describe("approved static landing", () => {
  it("loads in Dutch by default with NL before EN", () => {
    render(<ApprovedStaticLanding />);

    expect(
      screen.getByRole("heading", {
        name: /nederlands juridisch onderzoek, geworteld in bronnen/i,
      }),
    ).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    expect(buttons[1]).toHaveTextContent("NL");
    expect(buttons[2]).toHaveTextContent("EN");
    expect(
      screen.getAllByRole("link", { name: /vraag bèta-toegang aan/i })[0],
    ).toHaveAttribute(
      "href",
      "mailto:hello@veridicta.nl?subject=Veridicta%20beta%20access%20request",
    );
    expect(
      screen.getAllByRole("link", { name: /plan een demonstratie/i })[0],
    ).toHaveAttribute(
      "href",
      "mailto:hello@veridicta.nl?subject=Veridicta%20walkthrough%20request",
    );
    expect(screen.getAllByRole("link", { name: /inloggen/i })[0])
      .toHaveAttribute("href", "/login");
    expect(screen.getAllByRole("link", { name: "hello@veridicta.nl" })[0])
      .toHaveAttribute("href", "mailto:hello@veridicta.nl");
    expect(screen.getByText(/geeft geen juridisch advies/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Generieke\s+AI-tools versnellen het schrijven/i),
    ).toBeInTheDocument();
  });

  it("switches between Dutch and English copy", () => {
    render(<ApprovedStaticLanding />);

    fireEvent.click(screen.getAllByRole("button", { name: "EN" })[0]);

    expect(
      screen.getByRole("heading", {
        name: /dutch legal research, grounded in sources/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /request beta access/i })[0],
    ).toHaveAttribute(
      "href",
      "mailto:hello@veridicta.nl?subject=Veridicta%20beta%20access%20request",
    );
  });

  it("scrolls to the top when the header logo is clicked", () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });
    render(<ApprovedStaticLanding />);

    fireEvent.click(screen.getByRole("button", { name: "Veridicta home" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
