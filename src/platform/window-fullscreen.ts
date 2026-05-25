import { getPlatform } from "./index";

/** Toggle fullscreen for the current window. */
export async function toggleWindowFullscreen(): Promise<void> {
  if (getPlatform() === "tauri") {
    const { toggleWindowFullscreen: toggle } = await import("./window-fullscreen.tauri");
    return toggle();
  }
  const { toggleWindowFullscreen: toggle } = await import("./window-fullscreen.web");
  return toggle();
}
