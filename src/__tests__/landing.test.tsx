import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApprovedStaticLanding } from "@/components/landing/ApprovedStaticLanding";

describe("approved static landing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads in Dutch by default with NL before EN", () => {
    render(<ApprovedStaticLanding />);

    expect(
      screen.getByRole("heading", {
        name: /nederlands juridisch onderzoek, onderbouwd met bronnen/i,
      }),
    ).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    expect(buttons[1]).toHaveTextContent("NL");
    expect(buttons[2]).toHaveTextContent("EN");
    expect(
      screen.getAllByRole("button", { name: /vraag een demo aan/i })[0],
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /plan een demonstratie/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /inloggen/i })[0])
      .toHaveAttribute("href", "/login");
    expect(screen.getAllByRole("link", { name: "hello@clarvo.nl" })[0])
      .toHaveAttribute("href", "mailto:hello@clarvo.nl");
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
      screen.getAllByRole("button", { name: /request a demo/i })[0],
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /book a walkthrough/i }),
    ).not.toBeInTheDocument();
  });

  it("opens the beta access modal and shows the success state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<ApprovedStaticLanding />);

    fireEvent.click(
      screen.getAllByRole("button", { name: /vraag een demo aan/i })[0],
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Naam"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByLabelText("E-mailadres"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Organisatie"), {
      target: { value: "Clarvo Test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Demo aanvragen" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/beta-access",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(
      await screen.findByText(/we hebben uw aanvraag ontvangen/i),
    ).toBeInTheDocument();
  });

  it("scrolls to the top when the header logo is clicked", () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });
    render(<ApprovedStaticLanding />);

    fireEvent.click(screen.getByRole("button", { name: "Clarvo home" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
