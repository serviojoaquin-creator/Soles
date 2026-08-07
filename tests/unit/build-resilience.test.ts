import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("production build resilience", () => {
  it("does not require downloading Google Fonts during the build", () => {
    const rootLayout = readFileSync(
      resolve(process.cwd(), "src/app/layout.tsx"),
      "utf8",
    );

    expect(rootLayout).not.toContain("next/font/google");
    expect(rootLayout).not.toContain("fonts.googleapis.com");
  });

  it("ships baseline browser security headers", () => {
    const nextConfig = readFileSync(
      resolve(process.cwd(), "next.config.ts"),
      "utf8",
    );

    expect(nextConfig).toContain("X-Content-Type-Options");
    expect(nextConfig).toContain("X-Frame-Options");
    expect(nextConfig).toContain("Referrer-Policy");
    expect(nextConfig).toContain("Permissions-Policy");
  });
});
