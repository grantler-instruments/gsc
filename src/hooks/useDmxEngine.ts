import { useEffect, useRef } from "react";
import { syncCueTriggerEngine } from "../lib/cue-trigger-engine-sync";
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
