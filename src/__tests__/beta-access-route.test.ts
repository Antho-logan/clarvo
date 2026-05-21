import { afterEach, describe, expect, it, vi } from "vitest";

const resendMocks = vi.hoisted(() => ({
  send: vi.fn(),
  Resend: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: resendMocks.Resend,
}));

function jsonRequest(payload: unknown) {
  return new Request("http://localhost/api/beta-access", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

describe("/api/beta-access", () => {
  const originalEnv = {
    resendApiKey: process.env.RESEND_API_KEY,
    betaLeadTo: process.env.BETA_LEAD_TO,
    betaLeadFrom: process.env.BETA_LEAD_FROM,
    authEmailFrom: process.env.AUTH_EMAIL_FROM,
  };

  afterEach(() => {
    process.env.RESEND_API_KEY = originalEnv.resendApiKey;
    process.env.BETA_LEAD_TO = originalEnv.betaLeadTo;
    process.env.BETA_LEAD_FROM = originalEnv.betaLeadFrom;
    process.env.AUTH_EMAIL_FROM = originalEnv.authEmailFrom;
    resendMocks.send.mockReset();
    resendMocks.Resend.mockReset();
  });

  it("rejects invalid demo request payloads", async () => {
    const { POST } = await import("@/app/api/beta-access/route");

    const response = await POST(
      jsonRequest({ name: "Ada", company: "Clarvo" }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid lead payload" });
    expect(resendMocks.Resend).not.toHaveBeenCalled();
  });

  it("accepts honeypot submissions without sending email", async () => {
    const { POST } = await import("@/app/api/beta-access/route");

    const response = await POST(
      jsonRequest({ website: "https://spam.example", name: "Bot" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(resendMocks.Resend).not.toHaveBeenCalled();
  });

  it("returns 503 when email delivery is not configured", async () => {
    process.env.RESEND_API_KEY = "";
    const { POST } = await import("@/app/api/beta-access/route");

    const response = await POST(
      jsonRequest({
        locale: "nl",
        name: "Ada Lovelace",
        email: "ada@example.com",
        company: "Clarvo",
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Demo request email delivery is not configured",
    });
  });

  it("sends demo requests through Resend", async () => {
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.BETA_LEAD_TO = "sales@clarvo.nl";
    process.env.BETA_LEAD_FROM = "Clarvo <demo@clarvo.nl>";
    resendMocks.send.mockResolvedValue({ error: null });
    resendMocks.Resend.mockImplementation(function ResendMock(
      this: { emails: { send: typeof resendMocks.send } },
    ) {
      this.emails = { send: resendMocks.send };
    });
    const { POST } = await import("@/app/api/beta-access/route");

    const response = await POST(
      jsonRequest({
        locale: "nl",
        name: "Ada Lovelace",
        email: "ADA@EXAMPLE.COM",
        company: "Clarvo",
        role: "Arbeidsrecht",
        message: "Ik wil een demo plannen.",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(resendMocks.Resend).toHaveBeenCalledWith("test-resend-key");
    expect(resendMocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Clarvo <demo@clarvo.nl>",
        to: "sales@clarvo.nl",
        replyTo: "ada@example.com",
        subject: "Clarvo demo request - Ada Lovelace",
        html: expect.stringContaining("New Clarvo demo request"),
      }),
    );
  });
});
