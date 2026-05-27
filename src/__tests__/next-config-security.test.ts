import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("Next security headers", () => {
  it("sets basic launch-safe security headers for all routes", async () => {
    const headerRules = await nextConfig.headers?.();
    const allRoutes = headerRules?.find((rule) => rule.source === "/:path*");

    expect(allRoutes?.headers).toEqual(
      expect.arrayContaining([
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        { key: "X-DNS-Prefetch-Control", value: "on" },
      ]),
    );
  });
});
