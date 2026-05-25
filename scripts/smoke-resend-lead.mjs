import fs from "node:fs";
import { Resend } from "resend";

function loadEnvLocal() {
  if (!fs.existsSync(".env.local")) {
    return;
  }

  const raw = fs.readFileSync(".env.local", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const index = trimmed.indexOf("=");
    if (index === -1) {
      continue;
    }
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function sanitizeResendError(error) {
  const value = error || {};
  return {
    name: typeof value.name === "string" ? value.name : undefined,
    message: typeof value.message === "string" ? value.message : undefined,
    status:
      typeof value.status === "number" || typeof value.status === "string"
        ? value.status
        : typeof value.statusCode === "number" ||
            typeof value.statusCode === "string"
          ? value.statusCode
          : undefined,
    code:
      typeof value.code === "number" || typeof value.code === "string"
        ? value.code
        : undefined,
  };
}

async function sendChecked(label, resend, payload) {
  const { error } = await resend.emails.send(payload);
  if (error) {
    console.log(`${label}: failed`, sanitizeResendError(error));
    return false;
  }
  console.log(`${label}: succeeded`);
  return true;
}

loadEnvLocal();

const leadEmail = process.argv[2]?.trim().toLowerCase();
if (!leadEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail)) {
  console.error("Usage: npm run smoke:resend -- user@example.com");
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY;
const to = process.env.BETA_LEAD_TO || "hello@clarvo.nl";
const from =
  process.env.BETA_LEAD_FROM ||
  process.env.AUTH_EMAIL_FROM ||
  "Clarvo <hello@clarvo.nl>";

console.log("RESEND_API_KEY present:", apiKey ? "yes" : "no");
console.log("BETA_LEAD_TO:", to);
console.log("Sender:", from);
console.log("Lead confirmation recipient:", leadEmail);

if (!apiKey) {
  process.exit(1);
}

const resend = new Resend(apiKey);
const internalOk = await sendChecked("Internal notification", resend, {
  from,
  to,
  replyTo: leadEmail,
  subject: "Clarvo Resend smoke test - internal notification",
  html: `
    <h2>Clarvo Resend smoke test</h2>
    <p>This verifies the internal demo-request notification path.</p>
    <p>This is not legal advice.</p>
  `,
});

const confirmationOk = await sendChecked("Lead confirmation", resend, {
  from,
  to: leadEmail,
  replyTo: "hello@clarvo.nl",
  subject: "We received your Clarvo demo request",
  html: `
    <p>Thanks for your interest in Clarvo. We received your demo request and will contact you soon. Clarvo is currently a private beta for source-backed Dutch legal research, first focused on tenancy law and employment law.</p>
    <p>This is not legal advice.</p>
  `,
});

process.exit(internalOk && confirmationOk ? 0 : 1);
