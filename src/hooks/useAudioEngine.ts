import { useEffect } from "react";
import { audioEngine } from "../audio/engine";
import { useFadeStore } from "../stores/fade";
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
    const unlock = () => {
      void audioEngine.unlock();
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });

    audioEngine.onVoiceEnded((cueId) => {
      useTransportStore.getState().stopCue(cueId);
    });

    const runSync = () => {
      const { activeCueIds, masterVolume, cueStartedAtMs } = useTransportStore.getState();
      if (activeCueIds.length === 0) {
        void audioEngine.stopAll();
        return;
      }
      const cues = allProjectCues(useProjectStore.getState());
      void audioEngine.sync(activeCueIds, cues, masterVolume, cueStartedAtMs);
    };

    const updateLevels = () => {
      const { activeCueIds, masterVolume } = useTransportStore.getState();
      if (activeCueIds.length === 0) return;
      const cues = allProjectCues(useProjectStore.getState());
      audioEngine.updateActiveVoiceLevels(cues, masterVolume);
    };

    runSync();
    const unsubTransport = useTransportStore.subscribe((state, prev) => {
      if (audioSyncStateChanged(selectAudioSyncState(prev), selectAudioSyncState(state))) {
        runSync();
      }
    });

    const unsubProject = useProjectStore.subscribe((s, prev) => {
      if (s.cueLists === prev.cueLists) return;
      runSync();
    });

    let prevFadeFrame = 0;
    let hadActiveFades = false;
    const unsubFade = useFadeStore.subscribe((s) => {
      const hasActiveFades = Object.keys(s.fadesByTargetId).length > 0;
      if (!hasActiveFades && !hadActiveFades) return;
      if (s.frameMs === prevFadeFrame) return;
      prevFadeFrame = s.frameMs;
      hadActiveFades = hasActiveFades;

      updateLevels();
    });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      audioEngine.onVoiceEnded(null);
      unsubTransport();
      unsubProject();
      unsubFade();
      void audioEngine.stopAll();
    };
  }, []);
}
