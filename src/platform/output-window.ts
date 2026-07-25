import { t } from "../i18n/t";
import { getPlatform } from "./index";

const OUTPUT_LABEL = "output";
const OUTPUT_WINDOW_NAME = "gsc-output";
const WEB_OUTPUT_WINDOW_FEATURES =
  "popup,width=1280,height=720,menubar=no,toolbar=no,location=no,status=no";

function outputUrl(): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  const url = new URL(base);
  url.searchParams.set("mode", "output");
  return url.toString();
}

let webOutputWindow: Window | null = null;

async function openWebOutputWindow(focus = true): Promise<void> {
  if (webOutputWindow && !webOutputWindow.closed) {
    if (focus) {
      webOutputWindow.focus();
    }
    return;
  }

  webOutputWindow = window.open(outputUrl(), OUTPUT_WINDOW_NAME, WEB_OUTPUT_WINDOW_FEATURES);

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
}

export function isOutputMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mode") === "output";
}
