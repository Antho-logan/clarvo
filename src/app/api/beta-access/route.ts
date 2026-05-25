import { sendDemoLeadEmail } from "@/lib/leads";

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

  const result = await sendDemoLeadEmail({
    locale,
    name,
    email,
    company,
    role,
    message,
  });

  if (!result.ok && result.reason === "missing_resend_api_key") {
    return Response.json(
      {
        error: "Demo request email delivery is not configured",
        reason: "missing_resend_api_key",
      },
      { status: 503 },
    );
  }

  if (!result.ok) {
    return Response.json(
      {
        error: "Email delivery failed",
        reason: "internal_notification_failed",
      },
      { status: 502 },
    );
  }

  if (result.confirmationEmail === "failed") {
    return Response.json({ ok: true, confirmationEmail: "failed" });
  }

  return Response.json({ ok: true });
}
