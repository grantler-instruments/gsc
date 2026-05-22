import { useEffect } from "react";
import { audioEngine } from "../audio/engine";
import { useFadeStore } from "../stores/fade";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";

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
      void audioEngine.unlock();
      const { activeCueIds, masterVolume, cueStartedAtMs } =
        useTransportStore.getState();
      if (activeCueIds.length === 0) {
        void audioEngine.stopAll();
        return;
      }
      const list = getActiveCueListFromState(useProjectStore.getState());
      if (!list) return;
      void audioEngine.sync(
        activeCueIds,
        list.cues,
        masterVolume,
        cueStartedAtMs,
      );
    };

    runSync();
    const unsubTransport = useTransportStore.subscribe((state, prev) => {
      if (
        audioSyncStateChanged(
          selectAudioSyncState(prev),
          selectAudioSyncState(state),
        )
      ) {
        runSync();
      }
    });

    const unsubProject = useProjectStore.subscribe((s, prev) => {
      const list = getActiveCueListFromState(s);
      const prevList = getActiveCueListFromState(prev);
      if (list?.cues !== prevList?.cues) {
        runSync();
      }
    });

    let prevFadeFrame = 0;
    const unsubFade = useFadeStore.subscribe((s) => {
      if (Object.keys(s.fadesByTargetId).length === 0) return;
      if (s.frameMs === prevFadeFrame) return;
      prevFadeFrame = s.frameMs;

      const { activeCueIds, masterVolume } = useTransportStore.getState();
      if (activeCueIds.length === 0) return;
      const list = getActiveCueListFromState(useProjectStore.getState());
      if (!list) return;
      audioEngine.updateActiveVoiceLevels(list.cues, masterVolume);
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
