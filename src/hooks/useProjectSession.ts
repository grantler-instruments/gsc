import { useEffect, useState } from "react";
import { t } from "../i18n/t";
import { notifyWarning } from "../lib/notifications";
import { projectPersistStateChanged, vfsPersistStateChanged } from "../lib/project-persist";
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
        notifyWarning(t("notification.restoreProjectFailed"));
      }
      if (cancelled) return;
      unsubs.push(
        useProjectStore.subscribe((state, prev) => {
          if (projectPersistStateChanged(prev, state)) {
            scheduleSave();
          }
        }),
        useVfsStore.subscribe((state, prev) => {
          if (vfsPersistStateChanged(prev, state)) {
            scheduleSave();
          }
        }),
        useProjectLocationStore.subscribe((state, prev) => {
          if (state.rootDir !== prev.rootDir) {
            scheduleSave();
          }
        }),
      );
      setReady(true);
    })();

    return () => {
      cancelled = true;
      for (const unsub of unsubs) unsub();
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []);

  return ready;
}
