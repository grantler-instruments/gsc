import { t } from "../i18n/t";
import { getOutputBusIdFromUrl } from "../types/output";
import { getPlatform } from "./index";

const OUTPUT_LABEL = "output";
const OUTPUT_WINDOW_NAME = "gsc-output";
const WEB_WATCH_MS = 1000;

export interface OpenOutputWindowOptions {
  busId?: string;
  busName?: string;
  focus?: boolean;
}

function outputUrl(busId?: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  const url = new URL(base);
  url.searchParams.set("mode", "output");
  if (busId) {
    url.searchParams.set("bus", busId);
  }
  return url.toString();
}

function outputWindowName(busId?: string): string {
  return busId ? `${OUTPUT_WINDOW_NAME}-${busId}` : OUTPUT_WINDOW_NAME;
}

function outputWindowLabel(busId?: string): string {
  return busId ? `${OUTPUT_LABEL}-${busId}` : OUTPUT_LABEL;
}

function outputWindowTitle(busName?: string): string {
  if (busName) {
    return t("videoOutput.windowTitleNamed", { name: busName });
  }
  return t("common.brand.outputWindowTitle");
}

const webOutputWindows = new Map<string | undefined, Window | null>();
let masterKeepAlive = false;
let webWatchInterval: ReturnType<typeof setInterval> | null = null;

function markMasterOutputWindowInitialized(): void {
  if (masterKeepAlive) return;
  masterKeepAlive = true;
  if (getPlatform() === "web") {
    startWebMasterOutputWindowWatchdog();
  }
}

function startWebMasterOutputWindowWatchdog(): void {
  if (webWatchInterval !== null) return;
  webWatchInterval = setInterval(() => {
    if (!masterKeepAlive) return;
    const master = webOutputWindows.get(undefined);
    if (master && !master.closed) return;
    void openWebOutputWindow({ busId: undefined, focus: false });
  }, WEB_WATCH_MS);
}

async function openWebOutputWindow({
  busId,
  focus = true,
}: OpenOutputWindowOptions): Promise<void> {
  const existing = webOutputWindows.get(busId);
  if (existing && !existing.closed) {
    if (focus) {
      existing.focus();
    }
    return;
  }

  const opened = window.open(outputUrl(busId), outputWindowName(busId), "noopener,noreferrer");
  if (!opened) {
    throw new Error(t("output.popupBlocked"));
  }

  webOutputWindows.set(busId, opened);
}

async function openTauriOutputWindow(busId?: string, busName?: string): Promise<void> {
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const label = outputWindowLabel(busId);
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  new WebviewWindow(label, {
    url: outputUrl(busId),
    title: outputWindowTitle(busName),
    decorations: true,
    fullscreen: false,
    width: 1280,
    height: 720,
    center: true,
    backgroundColor: "#000000",
  });
}

/** Opens or focuses an audience output window for the master or a video bus. */
export async function openOutputWindow(options: OpenOutputWindowOptions = {}): Promise<void> {
  const { busId, busName, focus = true } = options;
  if (getPlatform() === "tauri") {
    await openTauriOutputWindow(busId, busName);
  } else {
    await openWebOutputWindow({ busId, focus });
  }
  if (!busId) {
    markMasterOutputWindowInitialized();
  }
}

export function isOutputMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mode") === "output";
}

export function getCurrentOutputBusId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return getOutputBusIdFromUrl(window.location.search);
}

/** Opens or focuses an output window, using the bus name for the window title when provided. */
export async function openVideoBusOutputWindow(
  busId: string,
  busName: string,
  focus = true,
): Promise<void> {
  if (getPlatform() === "tauri") {
    await openTauriOutputWindow(busId, busName);
    return;
  }
  await openWebOutputWindow({ busId, focus });
}
