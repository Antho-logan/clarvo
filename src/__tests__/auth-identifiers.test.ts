import { afterEach, describe, expect, it } from "vitest";

import { resolveCredentialIdentity } from "@/lib/auth-identifiers";

describe("credential identity resolution", () => {
  const originalName = process.env.AUTH_DEMO_LOGIN_NAME;
  const originalEmail = process.env.AUTH_DEMO_LOGIN_EMAIL;

  afterEach(() => {
    process.env.AUTH_DEMO_LOGIN_NAME = originalName;
    process.env.AUTH_DEMO_LOGIN_EMAIL = originalEmail;
  });

  it("maps the configured MVP login name to the internal auth email", () => {
    process.env.AUTH_DEMO_LOGIN_NAME = "Anthony Logan";
    process.env.AUTH_DEMO_LOGIN_EMAIL = "anthony.logan@clarvo.local";

    expect(resolveCredentialIdentity(" Anthony Logan ")).toEqual({
      email: "anthony.logan@clarvo.local",
      name: "Anthony Logan",
    });
  });

  it("keeps normal email logins unchanged", () => {
    process.env.AUTH_DEMO_LOGIN_NAME = "Anthony Logan";
    process.env.AUTH_DEMO_LOGIN_EMAIL = "anthony.logan@clarvo.local";

    expect(resolveCredentialIdentity("Beta@Example.com")).toEqual({
      email: "beta@example.com",
      name: "beta",
    });
  });

  it("rejects non-email identifiers that are not the configured MVP login name", () => {
    process.env.AUTH_DEMO_LOGIN_NAME = "Anthony Logan";
    process.env.AUTH_DEMO_LOGIN_EMAIL = "anthony.logan@clarvo.local";

    expect(resolveCredentialIdentity("Someone Else")).toEqual({
      email: "",
      name: "",
    });
  });
});
