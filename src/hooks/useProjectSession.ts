import { useEffect, useState } from "react";
import { persistPlatformProject, restorePlatformProject } from "../platform/project-storage";
import { useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { useVfsStore } from "../stores/vfs";

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

/** Restore last project and autosave (web: localStorage+cache, Tauri: disk folder). */
export function useProjectSession(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    const scheduleSave = debounce(() => {
      void persistPlatformProject();
    }, 500);

    const onUnload = () => {
      void persistPlatformProject();
    };
    window.addEventListener("beforeunload", onUnload);

    void (async () => {
      try {
        await restorePlatformProject();
      } catch (err) {
        console.error("[session] restore failed", err);
      } finally {
        if (cancelled) return;
        unsubs.push(
          useProjectStore.subscribe(scheduleSave),
          useVfsStore.subscribe(scheduleSave),
          useProjectLocationStore.subscribe(scheduleSave),
        );
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      for (const unsub of unsubs) unsub();
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []);

  return ready;
}
