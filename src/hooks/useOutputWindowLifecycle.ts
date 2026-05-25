import { useEffect } from "react";
import { getPlatform } from "../platform";

/** Hide instead of destroy when the user closes the output window (Tauri). */
export function useOutputWindowLifecycle(): void {
  useEffect(() => {
    if (getPlatform() !== "tauri") return;

    let unlisten: (() => void) | undefined;

    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      unlisten = await win.onCloseRequested(async (event) => {
        event.preventDefault();
        await win.hide();
      });
    })();

    return () => {
      unlisten?.();
    };
  }, []);
}
