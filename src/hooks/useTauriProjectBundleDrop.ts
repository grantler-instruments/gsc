import { useEffect } from "react";
import { isProjectBundlePath } from "../lib/project-paths";
import { getPlatform } from "../platform";
import { openDroppedProjectBundle } from "../platform/project-storage";
import { useUiStore } from "../stores/ui";

/**
 * Tauri: when a .gsc.zip is dropped on the window, extract to an empty folder and load.
 */
export function useTauriProjectBundleDrop(): void {
  useEffect(() => {
    if (getPlatform() !== "tauri") return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        unlisten = await win.onDragDropEvent((event) => {
          if (cancelled || event.payload.type !== "drop") return;
          if (useUiStore.getState().showMode) return;

          const bundlePath = event.payload.paths.find(isProjectBundlePath);
          if (!bundlePath) return;

          void openDroppedProjectBundle(bundlePath);
        });
      } catch (err) {
        console.warn("[tauri] drag-drop listener unavailable", err);
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}
