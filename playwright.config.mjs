import { defineConfig, devices } from "playwright/test";

const baseURL = process.env.E2E_BASE_URL?.trim() || "http://localhost:3000";
const browserChannel = process.env.E2E_BROWSER_CHANNEL?.trim();
const channel = browserChannel ? { channel: browserChannel } : {};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "desktop-chromium",
      testMatch: /public\.spec\.mjs/,
      use: { ...devices["Desktop Chrome"], ...channel },
    },
    {
      name: "mobile-chromium",
      testMatch: /public\.spec\.mjs/,
      use: { ...devices["Pixel 7"], ...channel },
    },
    {
      name: "critical-flow-chromium",
      testMatch: /critical-flow\.spec\.mjs/,
      use: { ...devices["Desktop Chrome"], ...channel },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
