import { useEffect, useRef } from "react";
import { applyDmxCueToBuffers } from "../lib/dmx";
import { sendDmxUniverses } from "../platform/send-dmx";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";
import {
  cueTriggerTransportStateChanged,
  selectCueTriggerTransportState,
} from "./transport-cue-sync";

function fireDmxCue(cue: Cue): void {
  if (cue.type !== "dmx" || !cue.dmx) return;
  const fixtures = useProjectStore.getState().fixtures;
  const frames = applyDmxCueToBuffers(cue.dmx, fixtures);
  void sendDmxUniverses(frames);
}

/** Sends DMX when light cues enter the active transport set. */
export function useDmxEngine(): void {
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
        if (cue?.type === "dmx") {
          fireDmxCue(cue);
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
    return useTransportStore.subscribe((state, prev) => {
      if (
        cueTriggerTransportStateChanged(
          selectCueTriggerTransportState(prev),
          selectCueTriggerTransportState(state),
        )
      ) {
        sync();
      }
    });
  }, []);
}
