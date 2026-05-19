function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function displayNameFromEmail(email: string) {
  return email.split("@")[0] || email;
}

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function resolveCredentialIdentity(rawIdentifier: string) {
  const identifier = rawIdentifier.trim();
  const demoName = process.env.AUTH_DEMO_LOGIN_NAME?.trim();
  const demoEmail = process.env.AUTH_DEMO_LOGIN_EMAIL?.trim();

  if (
    identifier &&
    demoName &&
    demoEmail &&
    normalizeName(identifier) === normalizeName(demoName)
  ) {
    return {
      email: normalizeEmail(demoEmail),
      name: demoName,
    };
  }

  const email = normalizeEmail(identifier);
  if (!isEmailLike(email)) {
    return {
      email: "",
      name: "",
    };
  }

  return {
    email,
    name: displayNameFromEmail(email),
  };
}
