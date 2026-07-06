import { useEffect, useState } from "react";
import { t } from "../i18n/t";
import { notifyWarning } from "../lib/notifications";
import { projectPersistStateChanged, vfsPersistStateChanged } from "../lib/project-persist";
import { persistProjectSession, persistProjectSessionAsync } from "../lib/project-session";
import { getPlatform } from "../platform";
import { persistPlatformProject, restorePlatformProject } from "../platform/project-storage";
import { useProjectStore } from "../stores/project";
import { useProjectLoadingStore } from "../stores/project-loading";
import { useProjectLocationStore } from "../stores/project-location";
import { useVfsStore } from "../stores/vfs";

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

let sessionRestoreDone = false;
let webRestorePromise: Promise<void> | null = null;

async function restoreWebSessionOnce(): Promise<void> {
  if (!webRestorePromise) {
    webRestorePromise = restorePlatformProject()
      .then(() => undefined)
      .finally(() => {
        webRestorePromise = null;
      });
  }
  return webRestorePromise;
}

/** Test-only reset of session bootstrap state. */
export function resetProjectSessionBootstrapForTests(): void {
  sessionRestoreDone = false;
  webRestorePromise = null;
}

/** Restore last project and autosave (web: localStorage+cache, Tauri: disk folder). */
export function useProjectSession(): boolean {
  const [ready, setReady] = useState(sessionRestoreDone);

  useEffect(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    const scheduleSave = debounce(() => {
      void persistPlatformProject();
    }, 500);

    const flushWebSession = () => {
      persistProjectSession();
      void persistProjectSessionAsync();
    };

    const onUnload = () => {
      if (getPlatform() === "tauri") {
        void persistPlatformProject();
        return;
      }
      flushWebSession();
    };

    const onPageHide = () => {
      if (getPlatform() === "tauri") return;
      void persistProjectSessionAsync();
    };

    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onPageHide);

    const markReady = () => {
      sessionRestoreDone = true;
      if (!cancelled) setReady(true);
    };

    const attachPersistSubscriptions = () => {
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
      useProjectLoadingStore.getState().clearAssetProgress();
    };

    void (async () => {
      if (sessionRestoreDone) {
        markReady();
        attachPersistSubscriptions();
        return;
      }

      try {
        if (getPlatform() === "tauri") {
          const { applyTauriStartupChoice, prepareTauriStartupRestore } = await import(
            "../platform/project-storage.tauri"
          );
          const choice = await prepareTauriStartupRestore();
          if (cancelled) return;
          markReady();
          if (choice) {
            await applyTauriStartupChoice(choice);
          }
        } else {
          await restoreWebSessionOnce();
          if (cancelled) return;
          markReady();
        }
      } catch (err) {
        console.error("[session] restore failed", err);
        notifyWarning(t("notification.restoreProjectFailed"));
        if (!cancelled) markReady();
      }

      if (cancelled) return;
      attachPersistSubscriptions();
    })();

    return () => {
      cancelled = true;
      for (const unsub of unsubs) unsub();
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  return ready;
}
