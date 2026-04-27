import "server-only";

import { SignJWT } from "jose";

import { auth } from "@/auth";

function getJwtSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

export async function getBackendAuthToken() {
  const secret = getJwtSecret();
  if (process.env.AUTH_DEV_BYPASS === "true" && secret) {
    return new SignJWT({
      email: "demo@veridicta.local",
      name: "Demo User",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("dev-bypass-user")
      .setAudience("veridicta-api")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);
  }

  const session = await auth();
  const user = session?.user;
  const subject = user?.id || user?.email;

  if (!secret || !subject) {
    return null;
  }

  return new SignJWT({
    email: user?.email,
    name: user?.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setAudience("veridicta-api")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}
