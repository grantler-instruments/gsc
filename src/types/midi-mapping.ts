import type { MidiCueData } from "./cue";

/** Incoming message pattern to match (same shape as MIDI cue data). */
export type MidiMatch = MidiCueData;

export type MidiAction =
  | { type: "go-selected" }
  | { type: "go-cue"; cueId: string }
  | { type: "select-cue"; cueId: string }
  | { type: "panic" }
  | { type: "previous-cue" }
  | { type: "next-cue" };

export interface MidiMapping {
  id: string;
  match: MidiMatch;
  action: MidiAction;
  enabled?: boolean;
}

export const MIDI_ACTION_LABELS: Record<MidiAction["type"], string> = {
  "go-selected": "GO (selected cue)",
  "go-cue": "GO cue",
  "select-cue": "Select cue",
  panic: "Panic (stop all)",
  "previous-cue": "Previous cue",
  "next-cue": "Next cue",
};
