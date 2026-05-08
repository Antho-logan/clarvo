import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApprovedStaticLanding } from "@/components/landing/ApprovedStaticLanding";

describe("approved static landing", () => {
  it("renders the beta CTA and English landing copy", () => {
    render(<ApprovedStaticLanding />);

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
    expect(screen.getByText(/does not provide legal advice/i)).toBeInTheDocument();
  });

  it("switches between English and Dutch copy", () => {
    render(<ApprovedStaticLanding />);

    fireEvent.click(screen.getAllByRole("button", { name: "NL" })[0]);

    expect(
      screen.getByRole("heading", {
        name: /nederlands juridisch onderzoek, geworteld in bronnen/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /vraag bèta-toegang aan/i })[0])
      .toHaveAttribute(
        "href",
        "mailto:hello@veridicta.nl?subject=Veridicta%20beta%20access%20request",
      );
  });
});
