import { sendDemoLeadEmail } from "@/lib/leads";

export const runtime = "nodejs";

const FIELD_LIMITS = {
  name: 120,
  email: 254,
  company: 120,
  role: 120,
  message: 2000,
} as const;

const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

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

function isTooLong(value: string, maxLength: number) {
  return value.length > maxLength;
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function isRateLimited(key: string, now = Date.now()) {
  const current = rateLimitBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  current.count += 1;
  return false;
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

  if (
    isTooLong(name, FIELD_LIMITS.name) ||
    isTooLong(email, FIELD_LIMITS.email) ||
    isTooLong(company, FIELD_LIMITS.company) ||
    isTooLong(role, FIELD_LIMITS.role) ||
    isTooLong(message, FIELD_LIMITS.message)
  ) {
    return Response.json(
      { error: "Invalid lead payload", reason: "field_too_long" },
      { status: 400 },
    );
  }

  if (isRateLimited(getClientIp(request))) {
    return Response.json(
      { error: "Too many demo requests. Please try again later." },
      { status: 429 },
    );
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
