import { useEffect } from "react";
import { audioEngine } from "../audio/engine";
import { useFadeStore } from "../stores/fade";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";

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
      const { cueLists, activeCueListId } = useProjectStore.getState();
      const list =
        cueLists.find((l) => l.id === activeCueListId) ?? cueLists[0];
      if (!list) return;
      void audioEngine.sync(
        activeCueIds,
        list.cues,
        masterVolume,
        cueStartedAtMs,
      );
    };

    const unsubTransport = useTransportStore.subscribe(() => runSync());

    const unsubProject = useProjectStore.subscribe((s, prev) => {
      const list =
        s.cueLists.find((l) => l.id === s.activeCueListId) ?? s.cueLists[0];
      const prevList =
        prev.cueLists.find((l) => l.id === prev.activeCueListId) ??
        prev.cueLists[0];
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
      const { cueLists, activeCueListId } = useProjectStore.getState();
      const list =
        cueLists.find((l) => l.id === activeCueListId) ?? cueLists[0];
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
