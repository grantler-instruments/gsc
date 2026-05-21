import type { MidiCueData, MidiMessageKind } from "../types/cue";

export const MIDI_MESSAGE_KINDS: MidiMessageKind[] = [
  "note-on",
  "note-off",
  "control-change",
  "program-change",
];

export function defaultMidiCueData(): MidiCueData {
  return {
    channel: 1,
    kind: "note-on",
    note: 60,
    velocity: 127,
  };
}

export function noteNumberToName(note: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const n = Math.max(0, Math.min(127, Math.round(note)));
  const octave = Math.floor(n / 12) - 1;
  return `${names[n % 12]}${octave}`;
}

export function formatMidiCue(data: MidiCueData): string {
  const ch = `Ch${data.channel}`;
  switch (data.kind) {
    case "note-on":
      return `${ch} Note On ${noteNumberToName(data.note ?? 60)} ${data.velocity ?? 0}`;
    case "note-off":
      return `${ch} Note Off ${noteNumberToName(data.note ?? 60)}`;
    case "control-change":
      return `${ch} CC ${data.controller ?? 0} = ${data.value ?? 0}`;
    case "program-change":
      return `${ch} Program ${data.program ?? 0}`;
    default:
      return ch;
  }
}

export function clampMidiByte(v: number): number {
  return Math.max(0, Math.min(127, Math.round(v)));
}

export function clampMidiChannel(v: number): number {
  return Math.max(1, Math.min(16, Math.round(v)));
}
