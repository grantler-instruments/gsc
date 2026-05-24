import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { startNewProject } from "../lib/new-project";
import { openSettings } from "../lib/open-settings";
import { openProjectFile, saveProjectFile } from "../lib/project-file-actions";
import { getPlatform } from "../platform";

/** Wire native menu shortcuts on Tauri desktop. */
export function useTauriAppMenu(): void {
  useEffect(() => {
    if (getPlatform() !== "tauri") return;

    const unlisteners: Array<() => void> = [];

    void listen("gsc://new-project", () => {
      void startNewProject();
    }).then((fn) => {
      unlisteners.push(fn);
    });

    void listen("gsc://open-settings", () => {
      openSettings();
    }).then((fn) => {
      unlisteners.push(fn);
    });

    void listen("gsc://open-project", () => {
      void openProjectFile();
    }).then((fn) => {
      unlisteners.push(fn);
    });

    void listen("gsc://save-project", () => {
      void saveProjectFile();
    }).then((fn) => {
      unlisteners.push(fn);
    });

    return () => {
      for (const unlisten of unlisteners) unlisten();
    };
  }, []);
}
