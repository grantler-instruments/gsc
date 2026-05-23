import { useEffect, useRef } from "react";
import { syncCueTriggerEngine } from "../lib/cue-trigger-engine-sync";
import { sendOscMessage } from "../platform/send-osc";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";
import {
  cueTriggerTransportStateChanged,
  selectCueTriggerTransportState,
} from "./transport-cue-sync";

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

      syncCueTriggerEngine({
        transport: { activeCueIds, cueStartedAtMs },
        cues: list.cues,
        cueType: "osc",
        lastFiredAtMs: lastFiredAtMsRef.current,
        onFire: fireOscCue,
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
