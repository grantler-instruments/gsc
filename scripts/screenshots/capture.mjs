#!/usr/bin/env node
/**
 * Capture marketing screenshots for the GSC website and app UI.
 *
 * Usage:
 *   npm run dev            # in another terminal (http://localhost:1421/gsc/)
 *   npm run screenshots
 *
 * Options:
 *   --base-url <url>   Site root with trailing slash (default: http://localhost:1421/gsc/)
 *   --out <dir>        Output directory (default: public/screenshots)
 *   --only <id>        Comma-separated shot ids
 *   --serve            Build Pages bundle and run vite preview on port 1421 first
 */

import { spawn } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { buildBrowserSeed, DEMO_CUE_IDS, seedFingerprint } from "./demo-project.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const DEFAULT_BASE_URL = "http://localhost:1421/gsc/";
const DEFAULT_OUT_DIR = path.join(repoRoot, "public/screenshots");
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };

/** @typedef {{ id: string, url: (base: string) => string, app?: boolean, prepare?: (page: import('puppeteer').Page) => Promise<void>, clip?: import('puppeteer').ScreenshotOptions['clip'], fullPage?: boolean }} Shot */

/** @type {Shot[]} */
const SHOTS = [
  {
    id: "website-hero",
    url: (base) => base,
    prepare: async (page) => {
      await page.evaluate(() => window.scrollTo(0, 0));
    },
  },
  {
    id: "website-features",
    url: (base) => base,
    prepare: async (page) => {
      await page.evaluate(() => {
        const heading = [...document.querySelectorAll("h2")].find((el) =>
          el.textContent?.includes("Features"),
        );
        heading?.scrollIntoView({ block: "start" });
      });
      await sleep(300);
    },
  },
  {
    id: "app-cue-list",
    app: true,
    url: (base) => `${base}app/`,
    prepare: async (page) => {
      await expandSequenceAndParallel(page);
      await selectCue(page, DEMO_CUE_IDS.opening);
    },
  },
  {
    id: "app-cue-lists",
    app: true,
    url: (base) => `${base}app/`,
    prepare: async (page) => {
      await clickTab(page, "Cue lists", "Act 2");
      await page.waitForSelector(`[data-cue-id="${DEMO_CUE_IDS.act2Intro}"]`);
    },
  },
  {
    id: "app-assets",
    app: true,
    url: (base) => `${base}app/`,
    prepare: async (page) => {
      await clickTab(page, "Sidebar", "Assets");
      await page.waitForSelector('[role="tabpanel"]');
    },
  },
  {
    id: "app-waveform",
    app: true,
    url: (base) => `${base}app/`,
    prepare: async (page) => {
      await selectCue(page, DEMO_CUE_IDS.opening);
      await clickTab(page, "Inspector", "Cue");
      await page.waitForFunction(
        () => {
          const canvas = document.querySelector("canvas");
          return canvas instanceof HTMLCanvasElement && canvas.width > 0;
        },
        { timeout: 20_000 },
      );
    },
  },
  {
    id: "app-fixture-plot",
    app: true,
    url: (base) => `${base}app/`,
    prepare: async (page) => {
      await clickTab(page, "Sidebar", "Active");
      await page.waitForSelector('[aria-label="Expand fixture preview"]');
      await page.click('[aria-label="Expand fixture preview"]');
      await sleep(500);
      await selectCue(page, DEMO_CUE_IDS.dmx);
    },
  },
  {
    id: "app-transport",
    app: true,
    url: (base) => `${base}app/`,
    prepare: async (page) => {
      await selectCue(page, DEMO_CUE_IDS.title);
    },
    clip: { x: 0, y: VIEWPORT.height - 120, width: VIEWPORT.width, height: 120 },
  },
  {
    id: "app-show-mode",
    app: true,
    url: (base) => `${base}app/`,
    prepare: async (page) => {
      await enterShowMode(page);
      await selectCue(page, DEMO_CUE_IDS.opening);
    },
  },
  {
    id: "app-active-cues",
    app: true,
    url: (base) => `${base}app/`,
    prepare: async (page) => {
      await selectCue(page, DEMO_CUE_IDS.title);
      await clickContaining(page, "footer button", "GO");
      await clickTab(page, "Sidebar", "Active");
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("Stop all")),
        { timeout: 10_000 },
      );
      await sleep(600);
    },
  },
  {
    id: "app-settings-midi",
    app: true,
    url: (base) => `${base}app/`,
    prepare: async (page) => {
      await page.click('[aria-label="File menu"]');
      await clickContaining(page, '[role="menuitem"]', "Settings");
      await clickContaining(page, '[role="dialog"] [role="tab"]', "MIDI map");
      await page.waitForSelector('[role="dialog"]');
    },
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickContaining(page, selector, text) {
  await page.evaluate(
    (sel, needle) => {
      const target = [...document.querySelectorAll(sel)].find((node) =>
        node.textContent?.includes(needle),
      );
      target?.click();
    },
    selector,
    text,
  );
}

async function clickTab(page, tablistLabel, tabText) {
  await clickContaining(page, `[role="tablist"][aria-label="${tablistLabel}"] button`, tabText);
}

function parseArgs(argv) {
  /** @type {{ baseUrl: string, outDir: string, only: string[] | null, serve: boolean }} */
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    outDir: DEFAULT_OUT_DIR,
    only: null,
    serve: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--base-url") {
      options.baseUrl = argv[++i] ?? options.baseUrl;
    } else if (arg === "--out") {
      options.outDir = path.resolve(argv[++i] ?? options.outDir);
    } else if (arg === "--only") {
      options.only = (argv[++i] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === "--serve") {
      options.serve = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: node scripts/screenshots/capture.mjs [options]

Options:
  --base-url <url>   Default: ${DEFAULT_BASE_URL}
  --out <dir>        Default: ${DEFAULT_OUT_DIR}
  --only <ids>       Comma-separated shot ids
  --serve              Run "npm run preview:pages" on port 1421 (builds first if needed)
`);
      process.exit(0);
    }
  }

  if (!options.baseUrl.endsWith("/")) {
    options.baseUrl += "/";
  }

  return options;
}

async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

/** @returns {Promise<{ url: string, close: () => Promise<void> }>} */
async function maybeStartPreviewServer(baseUrl) {
  if (!(await urlReachable(baseUrl))) {
    throw new Error(
      `Could not reach ${baseUrl}. Start the site with "npm run dev" or rerun with --serve.`,
    );
  }
  return {
    url: baseUrl,
    close: async () => {},
  };
}

/** @returns {Promise<{ url: string, close: () => Promise<void> }>} */
async function startPreviewServer(baseUrl) {
  if (await urlReachable(baseUrl)) {
    console.log(`[screenshots] using existing server at ${baseUrl}`);
    return {
      url: baseUrl,
      close: async () => {},
    };
  }

  const distDir = path.join(repoRoot, "dist");
  if (!(await pathExists(distDir))) {
    console.log("[screenshots] dist/ missing — running npm run build:pages …");
    await runCommand("npm", ["run", "build:pages"], repoRoot);
  }

  const preview = spawn("npm", ["run", "preview:pages", "--", "--port", "1421", "--strictPort"], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await urlReachable(baseUrl)) {
      return {
        url: baseUrl,
        close: async () => {
          preview.kill("SIGTERM");
          await sleep(500);
        },
      };
    }
    await sleep(500);
  }

  preview.kill("SIGTERM");
  throw new Error(`Timed out waiting for preview server at ${baseUrl}`);
}

async function urlReachable(url) {
  try {
    const response = await fetch(url, { redirect: "follow" });
    return response.ok;
  } catch {
    return false;
  }
}

async function seedDemoProject(page, seed, baseUrl) {
  const cacheDir = path.join(repoRoot, "scripts/screenshots/.cache");
  await mkdir(cacheDir, { recursive: true });
  const bundlePath = path.join(cacheDir, "demo.gsc.zip");
  await writeFile(bundlePath, seed.bundleZip);

  await page.goto(new URL("app/", baseUrl).href, { waitUntil: "networkidle0" });
  await waitForAppReady(page);

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(
      "gsc-ui",
      JSON.stringify({
        state: {
          sidebarTab: "assets",
          rightSidebarTab: "cue",
          darkMode: true,
        },
        version: 0,
      }),
    );
  });

  const bundleInput = await page.waitForSelector('input[type="file"][accept*="zip"]');
  await bundleInput.uploadFile(bundlePath);

  await waitForDemoProject(page);
  await page.keyboard.press("Escape");
  await sleep(200);
}

async function waitForAppReady(page) {
  await page.waitForSelector("footer button");
}

async function waitForDemoProject(page) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[aria-label="Show name"]');
      return el instanceof HTMLInputElement && el.value === "Demo Show";
    },
    { timeout: 30_000 },
  );
}

async function selectCue(page, cueId) {
  const selector = `[data-cue-id="${cueId}"]`;
  await page.waitForSelector(selector);
  await page.click(selector);
  await sleep(150);
}

async function expandSequenceAndParallel(page) {
  for (const cueId of [DEMO_CUE_IDS.sequence, DEMO_CUE_IDS.parallel]) {
    const selector = `[data-cue-id="${cueId}"] button[aria-expanded="false"]`;
    const collapsed = await page.$(selector);
    if (collapsed) {
      await collapsed.click();
      await sleep(100);
    }
  }
}

async function enterShowMode(page) {
  await clickContaining(page, "header button", "Edit mode");
  await page.waitForSelector('[role="region"][aria-label="Active cues"]');
}

async function captureShot(page, shot, outDir, baseUrl) {
  const targetUrl = shot.url(baseUrl);
  await page.setViewport(VIEWPORT);

  if (shot.app) {
    const seed = buildBrowserSeed();
    await seedDemoProject(page, seed, baseUrl);
  } else {
    await page.goto(targetUrl, { waitUntil: "networkidle0" });
  }

  if (shot.prepare) {
    await shot.prepare(page);
  }

  await sleep(250);

  const filePath = path.join(outDir, `${shot.id}.png`);
  await page.screenshot({
    path: filePath,
    type: "png",
    fullPage: shot.fullPage ?? false,
    clip: shot.clip,
  });

  console.log(`[screenshots] wrote ${path.relative(repoRoot, filePath)}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let shots = SHOTS;
  if (options.only?.length) {
    shots = SHOTS.filter((shot) => options.only.includes(shot.id));
    if (shots.length === 0) {
      throw new Error(`No shots matched --only ${options.only.join(",")}`);
    }
  }

  await mkdir(options.outDir, { recursive: true });

  const seed = buildBrowserSeed();
  console.log(`[screenshots] demo seed ${seedFingerprint(seed)}`);

  const server = options.serve
    ? await startPreviewServer(options.baseUrl)
    : await maybeStartPreviewServer(options.baseUrl);

  const browser = await puppeteer.launch({
    headless: true,
    channel: "chrome",
    defaultViewport: VIEWPORT,
    args: ["--font-render-hinting=medium", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30_000);

    for (const shot of shots) {
      console.log(`[screenshots] capturing ${shot.id} …`);
      await captureShot(page, shot, options.outDir, server.url);
    }
  } finally {
    await browser.close();
    await server.close();
  }

  console.log(`[screenshots] done — ${shots.length} image(s) in ${options.outDir}`);
}

main().catch((err) => {
  console.error("[screenshots]", err.message ?? err);
  process.exit(1);
});
