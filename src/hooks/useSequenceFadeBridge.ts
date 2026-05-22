import { useEffect } from "react";
import { notifyFadeCueComplete } from "../lib/sequence-runner";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { setFadeCueCompleteHandler } from "../stores/fade";

/** Advance running sequences when a fade utility cue finishes. */
export function useSequenceFadeBridge(): void {
  useEffect(() => {
    setFadeCueCompleteHandler((fadeCueId) => {
      const cues = getActiveCueListFromState(useProjectStore.getState())?.cues ?? [];
      notifyFadeCueComplete(fadeCueId, cues);
    });

    return () => setFadeCueCompleteHandler(null);
  }, []);
}
