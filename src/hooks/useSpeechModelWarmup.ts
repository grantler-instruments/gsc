import { useEffect, useState } from "react";
import { syncSpeechModelReadyFromDisk } from "../lib/speech-model-cache";
import { getPlatform } from "../platform";
import { usePreferencesStore } from "../stores/preferences";
import { useSpeechModelStore } from "../stores/speech-model";

function scheduleIdleWarmup(run: () => void): () => void {
  if (typeof requestIdleCallback !== "undefined") {
    const id = requestIdleCallback(() => run(), { timeout: 10_000 });
    return () => cancelIdleCallback(id);
  }
  const timer = window.setTimeout(run, 2000);
  return () => window.clearTimeout(timer);
}

/** Sync install state from disk; optionally warm Kokoro in the browser after idle time. */
export function useSpeechModelWarmup(sessionReady: boolean): void {
  const speechModelReady = usePreferencesStore((s) => s.speechModelReady);
  const setSpeechModelReady = usePreferencesStore((s) => s.setSpeechModelReady);
  const warmUpIfReady = useSpeechModelStore((s) => s.warmUpIfReady);
  const [prefsSynced, setPrefsSynced] = useState(() => usePreferencesStore.persist.hasHydrated());

  useEffect(() => {
    if (prefsSynced) return;

    const syncFromDisk = () => {
      void syncSpeechModelReadyFromDisk(setSpeechModelReady).finally(() => {
        setPrefsSynced(true);
      });
    };

    if (usePreferencesStore.persist.hasHydrated()) {
      syncFromDisk();
      return;
    }

    return usePreferencesStore.persist.onFinishHydration(syncFromDisk);
  }, [prefsSynced, setSpeechModelReady]);

  useEffect(() => {
    if (!sessionReady || !prefsSynced || !speechModelReady) return;

    // Desktop: loading ~80 MB via IPC right after opening a show freezes WKWebView
    // (macOS beachball). Load on first Generate or when Speech settings opens instead.
    if (getPlatform() === "tauri") return;

    return scheduleIdleWarmup(() => {
      void warmUpIfReady();
    });
  }, [sessionReady, prefsSynced, speechModelReady, warmUpIfReady]);
}
