import { useEffect } from "react";
import { audioEngine } from "../audio/engine";
import { useFadeStore } from "../stores/fade";
import { usePreferencesStore } from "../stores/preferences";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";

function allProjectCues(state: { cueLists: { cues: Cue[] }[] }): Cue[] {
  return state.cueLists.flatMap((list) => list.cues);
}

const selectAudioSyncState = (s: {
  activeCueIds: string[];
  masterVolume: number;
  cueStartedAtMs: Record<string, number>;
}) => ({
  activeCueIds: s.activeCueIds,
  masterVolume: s.masterVolume,
  cueStartedAtMs: s.cueStartedAtMs,
});

function audioSyncStateChanged(
  prev: ReturnType<typeof selectAudioSyncState>,
  next: ReturnType<typeof selectAudioSyncState>,
): boolean {
  return (
    prev.activeCueIds !== next.activeCueIds ||
    prev.masterVolume !== next.masterVolume ||
    prev.cueStartedAtMs !== next.cueStartedAtMs
  );
}

/** Bridges transport state to the audio engine. */
export function useAudioEngine(): void {
  useEffect(() => {
    let cancelled = false;

    const unlock = () => {
      void audioEngine.unlock();
    };

    const runSync = () => {
      const { activeCueIds, masterVolume, cueStartedAtMs } = useTransportStore.getState();
      const { cueLists, audioBuses } = useProjectStore.getState();
      if (activeCueIds.length === 0) {
        audioEngine.syncMixer(audioBuses, masterVolume);
        void audioEngine.stopAll();
        return;
      }
      const cues = allProjectCues({ cueLists });
      void audioEngine.sync(activeCueIds, cues, masterVolume, cueStartedAtMs, audioBuses);
    };

    const syncMixerOnly = () => {
      const { masterVolume } = useTransportStore.getState();
      const { audioBuses } = useProjectStore.getState();
      audioEngine.syncMixer(audioBuses, masterVolume);
    };

    const updateLevels = () => {
      const { activeCueIds } = useTransportStore.getState();
      if (activeCueIds.length === 0) return;
      const cues = allProjectCues(useProjectStore.getState());
      audioEngine.updateActiveVoiceLevels(cues);
    };

    let unsubTransport = () => {};
    let unsubProject = () => {};
    let unsubFade = () => {};
    let unsubPrefs = () => {};

    const initAudioOutput = async () => {
      const soundCardId = usePreferencesStore.getState().soundCardId;
      await audioEngine.initDesktopOutput();
      await audioEngine.setOutputDevice(soundCardId);
      if (cancelled) return;

      audioEngine.onVoiceEnded((cueId) => {
        useTransportStore.getState().stopCue(cueId);
      });

      window.addEventListener("pointerdown", unlock, { passive: true });
      window.addEventListener("keydown", unlock, { passive: true });

      unsubPrefs = usePreferencesStore.subscribe((state, prev) => {
        if (state.soundCardId !== prev.soundCardId) {
          void audioEngine.setOutputDevice(state.soundCardId).then(() => runSync());
        }
      });

      unsubTransport = useTransportStore.subscribe((state, prev) => {
        if (audioSyncStateChanged(selectAudioSyncState(prev), selectAudioSyncState(state))) {
          runSync();
        } else if (prev.masterVolume !== state.masterVolume) {
          syncMixerOnly();
        }
      });

      unsubProject = useProjectStore.subscribe((s, prev) => {
        if (s.cueLists !== prev.cueLists || s.audioBuses !== prev.audioBuses) {
          runSync();
        }
      });

      let prevFadeFrame = 0;
      let hadActiveFades = false;
      unsubFade = useFadeStore.subscribe((s) => {
        const hasActiveFades = Object.keys(s.fadesByTargetId).length > 0;
        if (!hasActiveFades && !hadActiveFades) return;
        if (s.frameMs === prevFadeFrame) return;
        prevFadeFrame = s.frameMs;
        hadActiveFades = hasActiveFades;

        updateLevels();
      });

      runSync();
    };

    const start = () => {
      void initAudioOutput();
    };

    if (usePreferencesStore.persist.hasHydrated()) {
      start();
    } else {
      const unsubHydrated = usePreferencesStore.persist.onFinishHydration(() => {
        unsubHydrated();
        if (!cancelled) start();
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      audioEngine.onVoiceEnded(null);
      unsubPrefs();
      unsubTransport();
      unsubProject();
      unsubFade();
      void audioEngine.stopAll();
    };
  }, []);
}
