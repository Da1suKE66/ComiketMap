import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", fullyParallel: false, workers: 1, timeout: 45_000,
  expect: { timeout: 10_000 }, reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:5173", channel: process.env.PLAYWRIGHT_CHANNEL || undefined, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: { command: "npm run dev", url: "http://127.0.0.1:5173", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
