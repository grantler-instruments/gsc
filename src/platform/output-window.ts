import { t } from "../i18n/t";
import { getPlatform } from "./index";

const OUTPUT_LABEL = "output";
const OUTPUT_WINDOW_NAME = "gsc-output";
const WEB_WATCH_MS = 1000;

function outputUrl(): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  const url = new URL(base);
  url.searchParams.set("mode", "output");
  return url.toString();
}

let webOutputWindow: Window | null = null;
let keepAlive = false;
let webWatchInterval: ReturnType<typeof setInterval> | null = null;

function markOutputWindowInitialized(): void {
  if (keepAlive) return;
  keepAlive = true;
  if (getPlatform() === "web") {
    startWebOutputWindowWatchdog();
  }
}

function startWebOutputWindowWatchdog(): void {
  if (webWatchInterval !== null) return;
  webWatchInterval = setInterval(() => {
    if (!keepAlive) return;
    if (webOutputWindow && !webOutputWindow.closed) return;
    void openWebOutputWindow(false);
  }, WEB_WATCH_MS);
}

async function openWebOutputWindow(focus = true): Promise<void> {
  if (webOutputWindow && !webOutputWindow.closed) {
    if (focus) {
      webOutputWindow.focus();
    }
    return;
  }

  webOutputWindow = window.open(outputUrl(), OUTPUT_WINDOW_NAME, "noopener,noreferrer");

  if (!webOutputWindow) {
    throw new Error(t("output.popupBlocked"));
  }
}

async function openTauriOutputWindow(): Promise<void> {
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const existing = await WebviewWindow.getByLabel(OUTPUT_LABEL);
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  new WebviewWindow(OUTPUT_LABEL, {
    url: outputUrl(),
    title: t("common.brand.outputWindowTitle"),
    decorations: true,
    fullscreen: false,
    width: 1280,
    height: 720,
    center: true,
    backgroundColor: "#000000",
  });
}

/** Opens or focuses the audience output window. */
export async function openOutputWindow(): Promise<void> {
  if (getPlatform() === "tauri") {
    await openTauriOutputWindow();
  } else {
    await openWebOutputWindow();
  }
  markOutputWindowInitialized();
}

export function isOutputMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mode") === "output";
}
