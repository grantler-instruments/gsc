import { t } from "../i18n/t";
import { usePreferencesStore } from "../stores/preferences";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";
import type { MidiAction, MidiMapping, MidiMatch } from "../types/midi-mapping";
import { selectNextCue, selectPreviousCue } from "./cue-navigation";
import { midiMatches, parseMidiMessage } from "./midi";
import { randomId } from "./random-id";
import { triggerGoAndAdvance, triggerGoSelected, triggerHotCue } from "./transport-actions";

const lastFireByControl = new Map<string, number>();

/** Physical control identity for debounce (ignores on/off message type). */
export function midiControlKey(match: MidiMatch): string | null {
  switch (match.kind) {
    case "note-on":
      return (match.velocity ?? 0) > 0 ? `note:${match.channel}:${match.note ?? 60}` : null;
    case "note-off":
      return `note:${match.channel}:${match.note ?? 60}`;
    case "control-change":
      return (match.value ?? 0) >= 64 ? `cc:${match.channel}:${match.controller ?? 0}` : null;
    case "program-change":
      return `pc:${match.channel}:${match.program ?? 0}`;
    case "pitch-bend":
      return `pb:${match.channel}`;
    case "start":
    case "stop":
    case "continue":
      return match.kind;
    default:
      return null;
  }
}

function shouldDebounceControl(match: MidiMatch, debounceMs: number): boolean {
  if (debounceMs <= 0) return false;

  const key = midiControlKey(match);
  if (!key) return false;

  const now = performance.now();
  const last = lastFireByControl.get(key) ?? 0;
  if (now - last < debounceMs) return true;

  lastFireByControl.set(key, now);
  return false;
}

/** Clears per-control debounce timers (for tests). */
export function resetMidiControlDebounceState(): void {
  lastFireByControl.clear();
}

function findCueInActiveList(cueId: string): Cue | undefined {
  const list = getActiveCueListFromState(useProjectStore.getState());
  return list?.cues.find((c) => c.id === cueId);
}

function findCueAnywhere(cueId: string): Cue | undefined {
  for (const list of useProjectStore.getState().cueLists) {
    const cue = list.cues.find((c) => c.id === cueId);
    if (cue) return cue;
  }
  return undefined;
}

export function dispatchMidiAction(action: MidiAction): void {
  switch (action.type) {
    case "go-selected":
      triggerGoSelected();
      break;
    case "go-cue": {
      const cue = findCueInActiveList(action.cueId);
      if (cue) triggerGoAndAdvance(cue);
      break;
    }
    case "fire-hot-cue": {
      const cue = findCueAnywhere(action.cueId);
      if (cue) triggerHotCue(cue);
      break;
    }
    case "select-cue":
      useProjectStore.getState().selectCue(action.cueId);
      break;
    case "panic":
      useTransportStore.getState().panic();
      break;
    case "previous-cue":
      selectPreviousCue();
      break;
    case "next-cue":
      selectNextCue();
      break;
  }
}

export function handleIncomingMidi(data: number[], mappings: MidiMapping[]): void {
  const incoming = parseMidiMessage(data);
  if (!incoming) return;

  if (incoming.kind === "note-on" && (incoming.velocity ?? 0) === 0) {
    return;
  }

  const debounceMs = usePreferencesStore.getState().midiDebounceMs;

  for (const mapping of mappings) {
    if (mapping.enabled === false) continue;
    if (!midiMatches(mapping.match, incoming)) continue;
    if (shouldDebounceControl(incoming, debounceMs)) return;
    dispatchMidiAction(mapping.action);
    return;
  }
}

export function buildNoteToCueMappings(cues: Cue[], startNote = 36): MidiMapping[] {
  const topLevel = cues.filter((c) => !c.parentId);
  return topLevel.map((cue, i) => ({
    id: randomId(),
    match: {
      channel: 1,
      kind: "note-on",
      note: startNote + i,
      velocity: 127,
    },
    action: { type: "go-cue", cueId: cue.id },
  }));
}

export function formatMidiActionLabel(action: MidiAction, cues: Cue[]): string {
  switch (action.type) {
    case "go-selected":
      return t("midiMap.goSelected");
    case "panic":
      return t("midiMap.panic");
    case "go-cue": {
      const cue = cues.find((c) => c.id === action.cueId);
      return cue
        ? t("midiMap.goCueWithName", { number: cue.number, name: cue.name })
        : t("midiMap.goMissingCue");
    }
    case "fire-hot-cue": {
      const cue = cues.find((c) => c.id === action.cueId);
      return cue
        ? t("midiMap.hotCueWithName", { number: cue.number, name: cue.name })
        : t("midiMap.hotMissingCue");
    }
    case "select-cue": {
      const cue = cues.find((c) => c.id === action.cueId);
      return cue
        ? t("midiMap.selectCueWithName", { number: cue.number, name: cue.name })
        : t("midiMap.selectMissingCue");
    }
    case "previous-cue":
      return t("midiMap.previousCue");
    case "next-cue":
      return t("midiMap.nextCue");
  }
}
