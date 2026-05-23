import { getPlatform } from "./index";

const OUTPUT_LABEL = "output";
const OUTPUT_WINDOW_NAME = "gsc-output";

function outputUrl(): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  const url = new URL(base);
  url.searchParams.set("mode", "output");
  return url.toString();
}

let webOutputWindow: Window | null = null;

async function openWebOutputWindow(): Promise<void> {
  if (webOutputWindow && !webOutputWindow.closed) {
    webOutputWindow.focus();
    return;
  }

  webOutputWindow = window.open(outputUrl(), OUTPUT_WINDOW_NAME, "noopener,noreferrer");

  if (!webOutputWindow) {
    throw new Error("Could not open output window. Allow popups for this site and try again.");
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
    title: "GSC Output",
    decorations: false,
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
    return;
  }
  await openWebOutputWindow();
}

export function isOutputMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mode") === "output";
}
