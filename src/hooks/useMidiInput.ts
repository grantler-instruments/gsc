import { useEffect } from "react";
import { handleIncomingMidi } from "../lib/midi-mapping";
import { parseMidiMessage } from "../lib/midi";
import { openMidiInput } from "../platform/receive-midi";
import { usePreferencesStore } from "../stores/preferences";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";

/** Listens for MIDI input and runs project mappings (and learn mode). */
export function useMidiInput(): void {
  useEffect(() => {
    let cleanup = () => {};

    const attach = async () => {
      cleanup();
      const portId = usePreferencesStore.getState().midiInputId;
      cleanup = await openMidiInput(portId, (data) => {
        const learnAction = useUiStore.getState().midiLearnAction;
        if (learnAction) {
          const match = parseMidiMessage(data);
          if (!match) return;
          if (match.kind === "note-on" && (match.velocity ?? 0) === 0) {
            return;
          }
          useProjectStore.getState().addMidiMapping({ match, action: learnAction });
          useUiStore.getState().setMidiLearnAction(null);
          return;
        }

        const mappings = useProjectStore.getState().midiMappings;
        handleIncomingMidi(data, mappings);
      });
    };

    void attach();

    const unsubPref = usePreferencesStore.subscribe((s, prev) => {
      if (s.midiInputId !== prev.midiInputId) {
        void attach();
      }
    });

    return () => {
      unsubPref();
      cleanup();
    };
  }, []);
}
