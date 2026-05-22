import { useEffect, useRef } from "react";
import { sendOscMessage } from "../platform/send-osc";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";

function fireOscCue(cue: Cue): void {
  if (cue.type !== "osc" || !cue.osc) return;
  void sendOscMessage(cue.osc);
}

/** Sends OSC when osc cues enter the active transport set. */
export function useOscEngine(): void {
  const lastFiredAtMsRef = useRef(new Map<string, number>());

  useEffect(() => {
    const sync = () => {
      const { activeCueIds, cueStartedAtMs } = useTransportStore.getState();
      const list = getActiveCueListFromState(useProjectStore.getState());
      if (!list) return;

      const cueById = new Map(list.cues.map((c) => [c.id, c]));
      const activeSet = new Set(activeCueIds);

      for (const id of activeCueIds) {
        const startedAt = cueStartedAtMs[id];
        if (startedAt === undefined) continue;
        if (lastFiredAtMsRef.current.get(id) === startedAt) continue;

        const cue = cueById.get(id);
        if (cue?.type === "osc") {
          fireOscCue(cue);
        }
        lastFiredAtMsRef.current.set(id, startedAt);
      }

      for (const id of [...lastFiredAtMsRef.current.keys()]) {
        if (!activeSet.has(id)) {
          lastFiredAtMsRef.current.delete(id);
        }
      }
    };

    sync();
    return useTransportStore.subscribe(sync);
  }, []);
}
