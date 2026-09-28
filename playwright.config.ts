import { defineConfig, devices } from "@playwright/test";

const APP_URL = "http://localhost:1421/gsc/app/";
const isCi = !!process.env.CI;
/** CI runs `npm run build:pages` before e2e — skip the duplicate build in webServer. */
const skipWebServerBuild = isCi || process.env.PLAYWRIGHT_PREBUILT === "1";

/** Headless Ubuntu throttles background popups — keep output window timers/media realtime. */
const ciChromiumLaunchArgs = [
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
];

const chromiumUse = {
  ...devices["Desktop Chrome"],
  ...(isCi ? { launchOptions: { args: ciChromiumLaunchArgs } } : {}),
};

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : undefined,
  reporter: isCi
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "list",
  use: {
    baseURL: APP_URL,
    trace: isCi ? "retain-on-failure" : "on-first-retry",
    screenshot: isCi ? "only-on-failure" : "off",
  },
  projects: [
    {
      name: "chromium",
      grepInvert: /@smoke/,
      use: chromiumUse,
    },
    {
      name: "smoke",
      grep: /@smoke/,
      use: chromiumUse,
    },
  ],
  webServer: {
    command: skipWebServerBuild
      ? "npm run preview:pages -- --port 1421 --strictPort"
      : "npm run build:pages && npm run preview:pages -- --port 1421 --strictPort",
    url: APP_URL,
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
});
