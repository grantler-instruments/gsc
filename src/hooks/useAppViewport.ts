import { useEffect } from "react";
import { syncAppViewportSize } from "../lib/app-viewport";
import { getPlatform } from "../platform";

/** Sync CSS viewport variables when the window or display scale changes. */
export function useAppViewport(): void {
  useEffect(() => {
    syncAppViewportSize();

    const onResize = () => syncAppViewportSize();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    let unlistenResize: (() => void) | undefined;
    let unlistenScale: (() => void) | undefined;

    if (getPlatform() === "tauri") {
      void (async () => {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        unlistenResize = await win.onResized(() => syncAppViewportSize());
        unlistenScale = await win.onScaleChanged(() => syncAppViewportSize());
      })();
    }

    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      unlistenResize?.();
      unlistenScale?.();
    };
  }, []);
}
