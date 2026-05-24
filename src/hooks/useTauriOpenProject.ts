import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { openProjectPath } from "../lib/open-project-path";
import { getPlatform } from "../platform";

async function openProjectPaths(paths: string[]): Promise<void> {
  for (const path of paths) {
    await openProjectPath(path);
  }
}

/** Handle double-click / Open With for `.gsc` projects on desktop. */
export function useTauriOpenProject(sessionReady: boolean): void {
  useEffect(() => {
    if (getPlatform() !== "tauri" || !sessionReady) return;

    let cancelled = false;
    const unlisteners: Array<() => void> = [];

    void (async () => {
      const pending = await invoke<string[]>("take_pending_open_paths");
      if (!cancelled && pending.length > 0) {
        await openProjectPaths(pending);
      }

      const unlisten = await listen<string[]>("gsc://open-paths", (event) => {
        void openProjectPaths(event.payload);
      });
      unlisteners.push(unlisten);
    })();

    return () => {
      cancelled = true;
      for (const unlisten of unlisteners) unlisten();
    };
  }, [sessionReady]);
}
