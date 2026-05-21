import { useEffect, useRef } from "react";
import { encodeMidiMessage } from "../lib/midi";
import { sendMidiMessage } from "../platform/send-midi";
import { usePreferencesStore } from "../stores/preferences";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";

function fireMidiCue(cue: Cue): void {
  if (cue.type !== "midi" || !cue.midi) return;
  const message = encodeMidiMessage(cue.midi);
  if (message.length === 0) return;
  const portId = usePreferencesStore.getState().midiInterfaceId;
  void sendMidiMessage(portId, message);
}

/** Sends MIDI when midi cues enter the active transport set. */
export function useMidiEngine(): void {
  const lastFiredAtMsRef = useRef(new Map<string, number>());

  useEffect(() => {
    const sync = () => {
      const { activeCueIds, cueStartedAtMs } = useTransportStore.getState();
      const { cueLists, activeCueListId } = useProjectStore.getState();
      const list =
        cueLists.find((l) => l.id === activeCueListId) ?? cueLists[0];
      if (!list) return;

      const cueById = new Map(list.cues.map((c) => [c.id, c]));
      const activeSet = new Set(activeCueIds);

      for (const id of activeCueIds) {
        const startedAt = cueStartedAtMs[id];
        if (startedAt === undefined) continue;
        if (lastFiredAtMsRef.current.get(id) === startedAt) continue;

        const cue = cueById.get(id);
        if (cue?.type === "midi") {
          fireMidiCue(cue);
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
