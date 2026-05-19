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

export async function sendDemoLeadEmail(lead: DemoLead) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BETA_LEAD_TO || "hello@veridicta.nl";
  const from =
    process.env.BETA_LEAD_FROM ||
    process.env.AUTH_EMAIL_FROM ||
    "Veridicta <onboarding@resend.dev>";

  if (!apiKey) {
    return { ok: false, reason: "not_configured" as const };
  }

  const resend = new Resend(apiKey);
  const html = `
    <h2>New Veridicta demo request</h2>
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
    subject: `Veridicta demo request - ${lead.name}`,
    html,
  });

  if (error) {
    return { ok: false, reason: "delivery_failed" as const };
  }

  return { ok: true as const };
}
