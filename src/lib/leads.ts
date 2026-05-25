import { Resend } from "resend";

export type DemoLead = {
  locale: string;
  name: string;
  email: string;
  company: string;
  role: string;
  message: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function confirmationCopy(locale: string) {
  if (locale.toLowerCase().startsWith("nl")) {
    return {
      subject: "We hebben je Clarvo demo-aanvraag ontvangen",
      body:
        "Bedankt voor je interesse in Clarvo. We hebben je demo-aanvraag ontvangen en nemen binnenkort contact met je op. Clarvo is momenteel een private beta voor brononderbouwd juridisch onderzoek in Nederland, met eerste focus op huurrecht en arbeidsrecht.",
      disclaimer: "Dit is geen juridisch advies.",
    };
  }

  return {
    subject: "We received your Clarvo demo request",
    body:
      "Thanks for your interest in Clarvo. We received your demo request and will contact you soon. Clarvo is currently a private beta for source-backed Dutch legal research, first focused on tenancy law and employment law.",
    disclaimer: "This is not legal advice.",
  };
}

export async function sendDemoLeadEmail(lead: DemoLead) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BETA_LEAD_TO || "hello@clarvo.nl";
  const from =
    process.env.BETA_LEAD_FROM ||
    process.env.AUTH_EMAIL_FROM ||
    "Clarvo <hello@clarvo.nl>";

  if (!apiKey) {
    return { ok: false, reason: "not_configured" as const };
  }

  const resend = new Resend(apiKey);
  const html = `
    <h2>New Clarvo demo request</h2>
    <p><strong>Name:</strong> ${escapeHtml(lead.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>
    <p><strong>Company:</strong> ${escapeHtml(lead.company)}</p>
    <p><strong>Role / practice area:</strong> ${escapeHtml(lead.role || "-")}</p>
    <p><strong>Locale:</strong> ${escapeHtml(lead.locale)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(lead.message || "-").replaceAll("\n", "<br />")}</p>
  `;

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: lead.email,
    subject: `Clarvo demo request - ${lead.name}`,
    html,
  });

  if (error) {
    return { ok: false, reason: "delivery_failed" as const };
  }

  const confirmation = confirmationCopy(lead.locale);
  const confirmationResult = await resend.emails.send({
    from,
    to: lead.email,
    replyTo: "hello@clarvo.nl",
    subject: confirmation.subject,
    html: `
      <p>${escapeHtml(confirmation.body)}</p>
      <p>${escapeHtml(confirmation.disclaimer)}</p>
    `,
  });

  if (confirmationResult.error) {
    console.warn("Clarvo lead confirmation email failed");
  }

  return { ok: true as const };
}
