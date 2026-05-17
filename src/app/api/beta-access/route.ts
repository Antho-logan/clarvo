import { Resend } from "resend";

export const runtime = "nodejs";

type LeadPayload = {
  locale?: string;
  name?: string;
  email?: string;
  company?: string;
  role?: string;
  message?: string;
  website?: string;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as LeadPayload;

  if (clean(payload.website)) {
    return Response.json({ ok: true });
  }

  const name = clean(payload.name);
  const email = clean(payload.email).toLowerCase();
  const company = clean(payload.company);
  const role = clean(payload.role);
  const message = clean(payload.message);
  const locale = clean(payload.locale) || "unknown";

  if (!name || !company || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Invalid lead payload" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BETA_LEAD_TO || "hello@veridicta.nl";
  const from =
    process.env.BETA_LEAD_FROM ||
    process.env.AUTH_EMAIL_FROM ||
    "Veridicta <onboarding@resend.dev>";

  if (!apiKey) {
    return Response.json(
      { error: "Lead email delivery is not configured" },
      { status: 503 },
    );
  }

  const resend = new Resend(apiKey);
  const html = `
    <h2>New Veridicta beta access request</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Company:</strong> ${escapeHtml(company)}</p>
    <p><strong>Role / practice area:</strong> ${escapeHtml(role || "-")}</p>
    <p><strong>Locale:</strong> ${escapeHtml(locale)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message || "-").replaceAll("\n", "<br />")}</p>
  `;

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `Veridicta beta request - ${name}`,
    html,
  });

  if (error) {
    return Response.json({ error: "Email delivery failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
