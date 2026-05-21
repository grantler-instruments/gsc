import { useEffect } from "react";
import { notifyFadeCueComplete } from "../lib/sequence-runner";
import { useProjectStore } from "../stores/project";
import { setFadeCueCompleteHandler } from "../stores/fade";

/** Advance running sequences when a fade utility cue finishes. */
export function useSequenceFadeBridge(): void {
  useEffect(() => {
    setFadeCueCompleteHandler((fadeCueId) => {
      const { cueLists, activeCueListId } = useProjectStore.getState();
      const list =
        cueLists.find((l) => l.id === activeCueListId) ?? cueLists[0];
      const cues = list?.cues ?? [];
      notifyFadeCueComplete(fadeCueId, cues);
    });

    return () => setFadeCueCompleteHandler(null);
  }, []);
}
