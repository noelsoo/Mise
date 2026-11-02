import { defineConfig, devices } from "@playwright/test";

// Runs against a deployed URL (E2E_BASE_URL) or a local `next start`.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL, trace: "retain-on-failure", extraHTTPHeaders: process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : undefined },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run start", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
