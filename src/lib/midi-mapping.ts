import { t } from "../i18n/t";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";
import type { MidiAction, MidiMapping, MidiMatch } from "../types/midi-mapping";
import { selectNextCue, selectPreviousCue } from "./cue-navigation";
import { midiMatches, parseMidiMessage } from "./midi";
import { randomId } from "./random-id";
import { triggerGoAndAdvance, triggerGoSelected } from "./transport-actions";

const DEBOUNCE_MS = 50;

let lastFireKey = "";
let lastFireAt = 0;

function shouldDebounce(match: MidiMatch): boolean {
  const key = `${match.channel}:${match.kind}:${match.note ?? ""}:${match.controller ?? ""}:${match.pitchBend ?? ""}`;
  const now = performance.now();
  if (key === lastFireKey && now - lastFireAt < DEBOUNCE_MS) {
    return true;
  }
  lastFireKey = key;
  lastFireAt = now;
  return false;
}

function findCueInActiveList(cueId: string): Cue | undefined {
  const list = getActiveCueListFromState(useProjectStore.getState());
  return list?.cues.find((c) => c.id === cueId);
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

  if (shouldDebounce(incoming)) return;

  for (const mapping of mappings) {
    if (mapping.enabled === false) continue;
    if (midiMatches(mapping.match, incoming)) {
      dispatchMidiAction(mapping.action);
      return;
    }
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
