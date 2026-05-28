import { useEffect, useRef } from "react";
import { t } from "../i18n/t";
import { diskPathsMayHaveMedia, handleTauriMediaDrop } from "../lib/asset-drop";
import { notifyWarning } from "../lib/notifications";
import { openProjectPath } from "../lib/open-project-path";
import { isGscProjectDirPath, isProjectBundlePath } from "../lib/project-paths";
import { dropTargetAtPhysicalPosition, tauriDragHighlightState } from "../lib/tauri-drop";
import { dispatchTauriCueListDrag, dispatchTauriFileDrag } from "../lib/tauri-file-drag";
import { getPlatform } from "../platform";
import { useUiStore } from "../stores/ui";

/**
 * Tauri: native window drag-drop (OS file paths, not HTML5 DataTransfer).
 * - `.gsc` directory → open project
 * - `.gsc.zip` → import project bundle
 * - Media on cue list → import + create cues (same as web)
 * - Media on assets panel → import only
 */
export function useTauriProjectBundleDrop(): void {
  const pendingPathsRef = useRef<string[]>([]);
  const highlightGenRef = useRef(0);
  const lastTargetRef = useRef<Awaited<ReturnType<typeof dropTargetAtPhysicalPosition>> | null>(
    null,
  );

  useEffect(() => {
    if (getPlatform() !== "tauri") return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    const clearHighlights = () => {
      dispatchTauriFileDrag(false);
      dispatchTauriCueListDrag(false);
      pendingPathsRef.current = [];
      lastTargetRef.current = null;
    };

    const updateHighlights = async (position: { x: number; y: number }) => {
      const gen = ++highlightGenRef.current;
      if (useUiStore.getState().showMode || cancelled) {
        clearHighlights();
        return;
      }
      if (!diskPathsMayHaveMedia(pendingPathsRef.current)) {
        clearHighlights();
        return;
      }

      const target = await dropTargetAtPhysicalPosition(position);
      if (gen !== highlightGenRef.current || cancelled) return;
      lastTargetRef.current = target;

      const { assets, cueList } = tauriDragHighlightState(target);
      dispatchTauriFileDrag(assets);
      dispatchTauriCueListDrag(cueList);
    };

    void (async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        const webview = getCurrentWebview();
        unlisten = await webview.onDragDropEvent((event) => {
          if (cancelled) return;

          const { type } = event.payload;

          if (type === "enter") {
            pendingPathsRef.current = event.payload.paths;
            void updateHighlights(event.payload.position);
            return;
          }

          if (type === "over") {
            void updateHighlights(event.payload.position);
            return;
          }

          if (type === "leave") {
            clearHighlights();
            return;
          }

          if (event.payload.type !== "drop") return;

          const { paths, position } = event.payload;
          const targetHint = lastTargetRef.current ?? undefined;
          clearHighlights();
          if (useUiStore.getState().showMode) return;

          const bundlePath = paths.find(isProjectBundlePath);
          if (bundlePath) {
            void openProjectPath(bundlePath);
            return;
          }

          const projectDir = paths.find(isGscProjectDirPath);
          if (projectDir) {
            void openProjectPath(projectDir);
            return;
          }

          void handleTauriMediaDrop(paths, position, targetHint);
        });
      } catch (err) {
        console.warn("[tauri] drag-drop listener unavailable", err);
        notifyWarning(t("notification.nativeDropUnavailable"));
      }
    })();

    return () => {
      cancelled = true;
      clearHighlights();
      unlisten?.();
    };
  }, []);
}
