import { useEffect, useRef } from "react";
import { syncCueTriggerEngine } from "../lib/cue-trigger-engine-sync";
import { triggerDmxCue } from "../lib/trigger-dmx";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";
import {
  cueTriggerTransportStateChanged,
  selectCueTriggerTransportState,
} from "./transport-cue-sync";

function fireDmxCue(cue: Cue): void {
  triggerDmxCue(cue);
}

/** Sends DMX when light cues enter the active transport set (legacy fallback). */
export function useDmxEngine(): void {
  const lastFiredAtMsRef = useRef(new Map<string, number>());

  useEffect(() => {
    const sync = () => {
      const { activeCueIds, cueStartedAtMs } = useTransportStore.getState();
      const list = getActiveCueListFromState(useProjectStore.getState());
      if (!list) return;

      syncCueTriggerEngine({
        transport: { activeCueIds, cueStartedAtMs },
        cues: list.cues,
        cueType: "dmx",
        lastFiredAtMs: lastFiredAtMsRef.current,
        onFire: fireDmxCue,
      });
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
