import { t } from "../i18n/t";
import { getOutputIdFromUrl } from "../types/output";
import { MASTER_VIDEO_OUTPUT_ID } from "../types/video-output";
import { getPlatform } from "./index";

const OUTPUT_LABEL = "output";
const OUTPUT_WINDOW_NAME = "gsc-output";
const WEB_WATCH_MS = 1000;

export interface OpenOutputWindowOptions {
  outputId?: string;
  outputName?: string;
  /** @deprecated Use outputId. */
  busId?: string;
  /** @deprecated Use outputName. */
  busName?: string;
  focus?: boolean;
}

function resolveOutputId(options: OpenOutputWindowOptions): string {
  return options.outputId ?? options.busId ?? MASTER_VIDEO_OUTPUT_ID;
}

function outputUrl(outputId: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  const url = new URL(base);
  url.searchParams.set("mode", "output");
  url.searchParams.set("output", outputId);
  return url.toString();
}

function outputWindowName(outputId: string): string {
  return outputId === MASTER_VIDEO_OUTPUT_ID
    ? OUTPUT_WINDOW_NAME
    : `${OUTPUT_WINDOW_NAME}-${outputId}`;
}

function outputWindowLabel(outputId: string): string {
  return outputId === MASTER_VIDEO_OUTPUT_ID ? OUTPUT_LABEL : `${OUTPUT_LABEL}-${outputId}`;
}

function outputWindowTitle(outputName?: string): string {
  if (outputName) {
    return t("videoOutput.windowTitleNamed", { name: outputName });
  }
  return t("common.brand.outputWindowTitle");
}

const webOutputWindows = new Map<string, Window | null>();
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
    const master = webOutputWindows.get(MASTER_VIDEO_OUTPUT_ID);
    if (master && !master.closed) return;
    void openWebOutputWindow({ outputId: MASTER_VIDEO_OUTPUT_ID, focus: false });
  }, WEB_WATCH_MS);
}

async function openWebOutputWindow({
  outputId = MASTER_VIDEO_OUTPUT_ID,
  focus = true,
}: OpenOutputWindowOptions): Promise<void> {
  const id = resolveOutputId({ outputId });
  const existing = webOutputWindows.get(id);
  if (existing && !existing.closed) {
    if (focus) {
      existing.focus();
    }
    return;
  }

  const opened = window.open(outputUrl(id), outputWindowName(id), "noopener,noreferrer");
  if (!opened) {
    throw new Error(t("output.popupBlocked"));
  }

  webOutputWindows.set(id, opened);
}

async function openTauriOutputWindow(outputId: string, outputName?: string): Promise<void> {
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const label = outputWindowLabel(outputId);
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  new WebviewWindow(label, {
    url: outputUrl(outputId),
    title: outputWindowTitle(outputName),
    decorations: true,
    fullscreen: false,
    width: 1280,
    height: 720,
    center: true,
    backgroundColor: "#000000",
  });
}

/** Opens or focuses an audience output window for a video output destination. */
export async function openOutputWindow(options: OpenOutputWindowOptions = {}): Promise<void> {
  const outputId = resolveOutputId(options);
  const outputName = options.outputName ?? options.busName;
  const { focus = true } = options;
  if (getPlatform() === "tauri") {
    await openTauriOutputWindow(outputId, outputName);
  } else {
    await openWebOutputWindow({ outputId, focus });
  }
  if (outputId === MASTER_VIDEO_OUTPUT_ID) {
    markMasterOutputWindowInitialized();
  }
}

export function isOutputMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mode") === "output";
}

export function getCurrentOutputId(): string {
  if (typeof window === "undefined") return MASTER_VIDEO_OUTPUT_ID;
  return getOutputIdFromUrl(window.location.search);
}

/** @deprecated Use getCurrentOutputId. */
export function getCurrentOutputBusId(): string | undefined {
  const id = getCurrentOutputId();
  return id === MASTER_VIDEO_OUTPUT_ID ? undefined : id;
}

/** Opens or focuses an output window by destination id. */
export async function openVideoOutputWindow(
  outputId: string,
  outputName: string,
  focus = true,
): Promise<void> {
  await openOutputWindow({ outputId, outputName, focus });
}

/** @deprecated Use openVideoOutputWindow. */
export async function openVideoBusOutputWindow(
  busId: string,
  busName: string,
  focus = true,
): Promise<void> {
  await openVideoOutputWindow(busId, busName, focus);
}
