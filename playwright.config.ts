import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run build && npm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      JOBRAIN_E2E_MODE: "true",
      JOBRAIN_RATE_LIMIT_DISABLED: "true",
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@127.0.0.1:5432/jobrain",
      DIRECT_URL:
        process.env.DIRECT_URL ??
        "postgresql://postgres:postgres@127.0.0.1:5432/jobrain",
      JOBRAIN_USER_AGENT: "JoBrain-E2E",
    },
  },
});
