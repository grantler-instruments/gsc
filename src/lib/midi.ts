import type { MidiCueData, MidiMessageKind } from "../types/cue";
import type { MidiMatch } from "../types/midi-mapping";

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

/** Parse a short MIDI message into match fields. */
export function parseMidiMessage(bytes: number[]): MidiMatch | null {
  if (bytes.length < 1) return null;
  const status = bytes[0]!;
  const channel = (status & 0x0f) + 1;
  const hi = status & 0xf0;

  if (hi === 0x90 && bytes.length >= 3) {
    return {
      channel,
      kind: "note-on",
      note: bytes[1],
      velocity: bytes[2],
    };
  }
  if (hi === 0x80 && bytes.length >= 3) {
    return {
      channel,
      kind: "note-off",
      note: bytes[1],
      velocity: bytes[2],
    };
  }
  if (hi === 0xb0 && bytes.length >= 3) {
    return {
      channel,
      kind: "control-change",
      controller: bytes[1],
      value: bytes[2],
    };
  }
  if (hi === 0xc0 && bytes.length >= 2) {
    return {
      channel,
      kind: "program-change",
      program: bytes[1],
    };
  }
  return null;
}

export function midiMatches(mapping: MidiMatch, incoming: MidiMatch): boolean {
  if (mapping.channel !== incoming.channel || mapping.kind !== incoming.kind) {
    return false;
  }
  switch (mapping.kind) {
    case "note-on":
    case "note-off":
      return (mapping.note ?? 60) === (incoming.note ?? 60);
    case "control-change":
      return (
        (mapping.controller ?? 0) === (incoming.controller ?? 0) &&
        (mapping.value ?? 0) === (incoming.value ?? 0)
      );
    case "program-change":
      return (mapping.program ?? 0) === (incoming.program ?? 0);
    default:
      return false;
  }
}

/** Encode cue data as a standard short MIDI message (1–3 bytes). */
export function encodeMidiMessage(data: MidiCueData): number[] {
  const ch = clampMidiChannel(data.channel) - 1;
  switch (data.kind) {
    case "note-on":
      return [
        0x90 | ch,
        clampMidiByte(data.note ?? 60),
        clampMidiByte(data.velocity ?? 127),
      ];
    case "note-off":
      return [
        0x80 | ch,
        clampMidiByte(data.note ?? 60),
        clampMidiByte(data.velocity ?? 0),
      ];
    case "control-change":
      return [
        0xb0 | ch,
        clampMidiByte(data.controller ?? 0),
        clampMidiByte(data.value ?? 0),
      ];
    case "program-change":
      return [0xc0 | ch, clampMidiByte(data.program ?? 0)];
    default:
      return [];
  }
}
