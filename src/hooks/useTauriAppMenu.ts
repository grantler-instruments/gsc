import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { startNewProject } from "../lib/new-project";
import { getPlatform } from "../platform";

/** Wire native File → New Project (⌘N) on Tauri desktop. */
export function useTauriAppMenu(): void {
  useEffect(() => {
    if (getPlatform() !== "tauri") return;

    let unlisten: (() => void) | undefined;
    void listen("gsc://new-project", () => {
      void startNewProject();
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);
}
