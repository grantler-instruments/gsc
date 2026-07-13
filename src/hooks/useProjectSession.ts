import { useEffect, useState } from "react";
import { t } from "../i18n/t";
import { notifyWarning } from "../lib/notifications";
import { projectPersistStateChanged, vfsPersistStateChanged } from "../lib/project-persist";
import { persistProjectSession, persistProjectSessionAsync } from "../lib/project-session";
import { clearRestoreSteps, startRestoreStep, withRestoreStep } from "../lib/restore-progress";
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

/** Restore last project and autosave (web: localStorage+cache, Tauri: disk folder). */
export function useProjectSession(): boolean {
  const [ready, setReady] = useState(false);

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

    void (async () => {
      clearRestoreSteps();
      startRestoreStep("session", "project.restoreStep.session");
      try {
        if (getPlatform() === "tauri") {
          const { applyTauriStartupChoice, prepareTauriStartupRestore } = await import(
            "../platform/project-storage.tauri"
          );
          const choice = await withRestoreStep(
            "tauri-startup",
            "project.restoreStep.tauriStartup",
            () => prepareTauriStartupRestore(),
          );
          if (cancelled) return;
          setReady(true);
          if (choice) {
            await withRestoreStep("apply-choice", "project.restoreStep.applyChoice", () =>
              applyTauriStartupChoice(choice),
            );
          }
        } else {
          await withRestoreStep("web-restore", "project.restoreStep.webRestore", () =>
            restorePlatformProject(),
          );
          if (cancelled) return;
          setReady(true);
        }
      } catch (err) {
        console.error("[session] restore failed", err);
        notifyWarning(t("notification.restoreProjectFailed"));
        if (!cancelled) setReady(true);
      }
      if (cancelled) return;
      useProjectLoadingStore.getState().finishRestoreStep("session");
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
