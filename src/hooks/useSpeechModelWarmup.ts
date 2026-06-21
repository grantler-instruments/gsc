import { useEffect, useState } from "react";
import { syncSpeechModelReadyFromDisk } from "../lib/speech-model-cache";
import { usePreferencesStore } from "../stores/preferences";
import { useSpeechModelStore } from "../stores/speech-model";

/** Restore Kokoro into memory when the user previously downloaded the model. */
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
    void warmUpIfReady();
  }, [sessionReady, prefsSynced, speechModelReady, warmUpIfReady]);
}
