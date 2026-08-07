import { describe, expect, it } from "vitest";

import { appNavigation } from "@/lib/navigation";

describe("appNavigation", () => {
  it("uses unique internal routes", () => {
    const hrefs = appNavigation.map((item) => item.href);

    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs.every((href) => href.startsWith("/"))).toBe(true);
  });
});
