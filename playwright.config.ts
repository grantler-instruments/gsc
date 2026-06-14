import { defineConfig, devices } from "@playwright/test";

const APP_URL = "http://localhost:1421/gsc/app/";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: APP_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      grepInvert: /@smoke/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "smoke",
      grep: /@smoke/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build:pages && npm run preview:pages -- --port 1421 --strictPort",
    url: APP_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
