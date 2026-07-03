import { spawn, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const TAURI_DRIVER_HOST = "127.0.0.1";
const TAURI_DRIVER_PORT = 4444;
const TAURI_DRIVER_STATUS_URL = `http://${TAURI_DRIVER_HOST}:${TAURI_DRIVER_PORT}/status`;

let tauriDriver: ReturnType<typeof spawn> | undefined;
let exit = false;

function tauriBinaryName(): string {
  return process.platform === "win32" ? "gsc.exe" : "gsc";
}

function tauriBinaryPath(): string {
  return path.join(repoRoot, "src-tauri", "target", "debug", tauriBinaryName());
}

function tauriDriverPath(): string {
  return path.join(
    os.homedir(),
    ".cargo",
    "bin",
    process.platform === "win32" ? "tauri-driver.exe" : "tauri-driver",
  );
}

function closeTauriDriver(): void {
  exit = true;
  tauriDriver?.kill();
}

function onShutdown(fn: () => void): void {
  const cleanup = () => {
    try {
      fn();
    } finally {
      process.exit();
    }
  };
  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("SIGHUP", cleanup);
  process.on("SIGBREAK", cleanup);
}

onShutdown(() => {
  closeTauriDriver();
});

function killStaleNativeWebDrivers(): void {
  if (process.platform === "linux") {
    spawnSync("pkill", ["-f", "WebKitWebDriver"], { stdio: "ignore" });
  }
}

function startTauriDriver(): void {
  if (tauriDriver) return;

  tauriDriver = spawn(tauriDriverPath(), [], {
    stdio: [null, process.stdout, process.stderr],
  });

  tauriDriver.on("error", (error) => {
    console.error("tauri-driver error:", error);
    process.exit(1);
  });

  tauriDriver.on("exit", (code) => {
    if (!exit) {
      console.error("tauri-driver exited with code:", code);
      process.exit(1);
    }
  });
}

async function waitForTauriDriverReady(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(TAURI_DRIVER_STATUS_URL);
      if (response.ok) return;
    } catch {
      /* not ready yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`tauri-driver did not become ready at ${TAURI_DRIVER_STATUS_URL}`);
}

export const config: WebdriverIO.Config = {
  hostname: TAURI_DRIVER_HOST,
  port: TAURI_DRIVER_PORT,
  // Smoke first — warms WebKitWebDriver before the heavier output-window spec.
  specs: ["./specs/smoke-go.e2e.ts", "./specs/output-scratch-video.e2e.ts"],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      "tauri:options": {
        application: tauriBinaryPath(),
      },
    },
  ],
  reporters: ["spec"],
  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 180_000,
  },
  waitforTimeout: 15_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 3,
  logLevels: {
    webdriver: "warn",
  },
  onPrepare: async () => {
    if (process.platform === "darwin") {
      console.warn(
        "Skipping desktop e2e: official Tauri WebDriver does not support macOS (no WKWebView driver). Run on Linux or Windows.",
      );
      process.exit(0);
    }

    const build = spawnSync("npm", ["run", "tauri", "build", "--", "--debug", "--no-bundle"], {
      cwd: repoRoot,
      stdio: "inherit",
      shell: true,
    });

    if (build.status !== 0) {
      throw new Error("Failed to build debug Tauri app for desktop e2e");
    }

    if (
      process.platform === "linux" &&
      !spawnSync("which", ["WebKitWebDriver"], { shell: true }).stdout.length
    ) {
      throw new Error("WebKitWebDriver not found. Install webkit2gtk-driver (Linux CI).");
    }

    killStaleNativeWebDrivers();
    startTauriDriver();
    await waitForTauriDriverReady();
  },
  onComplete: () => {
    closeTauriDriver();
  },
};
