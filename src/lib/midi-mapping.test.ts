import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MIDI_DEBOUNCE_MS } from "../lib/midi-defaults";
import { usePreferencesStore } from "../stores/preferences";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { resetTestProject, testCue } from "../test/fixtures/cues";
import {
  buildNoteToCueMappings,
  dispatchMidiAction,
  formatMidiActionLabel,
  handleIncomingMidi,
  midiControlKey,
  resetMidiControlDebounceState,
} from "./midi-mapping";

function activeListSelection(): string[] {
  const { cueLists, activeCueListId } = useProjectStore.getState();
  return cueLists.find((l) => l.id === activeCueListId)?.selectedCueIds ?? [];
}

function resetTransport() {
  useTransportStore.setState({
    isPlaying: false,
    activeCueId: null,
    activeCueIds: [],
    cueStartedAtMs: {},
    runningSequences: {},
    masterVolume: 1,
  });
}

let mockNow = 10_000;

const goCueMapping = {
  id: "m1",
  match: { channel: 1, kind: "note-on" as const, note: 60, velocity: 127 },
  action: { type: "go-cue" as const, cueId: "a" },
};

describe("midiControlKey", () => {
  it("uses the same key for note-on and note-off on one control", () => {
    expect(midiControlKey({ channel: 1, kind: "note-on", note: 60, velocity: 127 })).toBe(
      "note:1:60",
    );
    expect(midiControlKey({ channel: 1, kind: "note-off", note: 60, velocity: 0 })).toBe(
      "note:1:60",
    );
    expect(midiControlKey({ channel: 1, kind: "note-on", note: 60, velocity: 0 })).toBe(
      "note:1:60",
    );
  });

  it("uses the same key for control-change regardless of value", () => {
    expect(midiControlKey({ channel: 1, kind: "control-change", controller: 7, value: 127 })).toBe(
      "cc:1:7",
    );
    expect(midiControlKey({ channel: 1, kind: "control-change", controller: 7, value: 1 })).toBe(
      "cc:1:7",
    );
  });

  it("uses separate keys for different notes", () => {
    expect(midiControlKey({ channel: 1, kind: "note-on", note: 60, velocity: 127 })).toBe(
      "note:1:60",
    );
    expect(midiControlKey({ channel: 1, kind: "note-on", note: 61, velocity: 127 })).toBe(
      "note:1:61",
    );
  });
});

describe("handleIncomingMidi", () => {
  beforeEach(() => {
    mockNow += 1000;
    resetTestProject([testCue("a", "A", "audio"), testCue("b", "B", "audio")]);
    resetTransport();
    resetMidiControlDebounceState();
    usePreferencesStore.setState({ midiDebounceMs: DEFAULT_MIDI_DEBOUNCE_MS });
    vi.spyOn(performance, "now").mockReturnValue(mockNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores note-on with zero velocity", () => {
    handleIncomingMidi(
      [0x90, 60, 0],
      [
        {
          id: "m1",
          match: { channel: 1, kind: "note-on", note: 60, velocity: 127 },
          action: { type: "select-cue", cueId: "a" },
        },
      ],
    );

    expect(activeListSelection()).toEqual([]);
  });

  it("dispatches the first enabled matching mapping", () => {
    handleIncomingMidi(
      [0x90, 60, 127],
      [
        {
          id: "m1",
          match: { channel: 1, kind: "note-on", note: 60, velocity: 127 },
          action: { type: "select-cue", cueId: "a" },
        },
        {
          id: "m2",
          match: { channel: 1, kind: "note-on", note: 60, velocity: 127 },
          action: { type: "select-cue", cueId: "b" },
        },
      ],
    );

    expect(activeListSelection()).toEqual(["a"]);
  });

  it("skips disabled mappings", () => {
    handleIncomingMidi(
      [0x90, 60, 127],
      [
        {
          id: "m1",
          enabled: false,
          match: { channel: 1, kind: "note-on", note: 60, velocity: 127 },
          action: { type: "select-cue", cueId: "a" },
        },
        {
          id: "m2",
          match: { channel: 1, kind: "note-on", note: 60, velocity: 127 },
          action: { type: "select-cue", cueId: "b" },
        },
      ],
    );

    expect(activeListSelection()).toEqual(["b"]);
  });

  it("debounces repeat presses on the same control within the debounce window", () => {
    handleIncomingMidi([0x90, 60, 127], [goCueMapping]);
    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);

    useTransportStore.getState().stop();
    vi.mocked(performance.now).mockReturnValue(mockNow + 10);

    handleIncomingMidi([0x90, 60, 127], [goCueMapping]);

    expect(useTransportStore.getState().activeCueIds).toEqual([]);
  });

  it("debounces on-off-on bounce on the same control", () => {
    handleIncomingMidi([0x90, 60, 127], [goCueMapping]);
    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);

    useTransportStore.getState().stop();
    vi.mocked(performance.now).mockReturnValue(mockNow + 20);
    handleIncomingMidi([0x80, 60, 0], [goCueMapping]);

    vi.mocked(performance.now).mockReturnValue(mockNow + 65);
    handleIncomingMidi([0x90, 60, 127], [goCueMapping]);

    expect(useTransportStore.getState().activeCueIds).toEqual([]);
  });

  it("allows a second press after the debounce window", () => {
    handleIncomingMidi([0x90, 60, 127], [goCueMapping]);
    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);

    useTransportStore.getState().stop();
    vi.mocked(performance.now).mockReturnValue(mockNow + DEFAULT_MIDI_DEBOUNCE_MS + 1);
    handleIncomingMidi([0x90, 60, 127], [goCueMapping]);

    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);
  });

  it("does not debounce different notes on the same channel", () => {
    handleIncomingMidi([0x90, 60, 127], [goCueMapping]);
    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);

    useTransportStore.getState().stop();
    vi.mocked(performance.now).mockReturnValue(mockNow + 10);

    handleIncomingMidi(
      [0x90, 61, 127],
      [
        {
          id: "m2",
          match: { channel: 1, kind: "note-on", note: 61, velocity: 127 },
          action: { type: "go-cue", cueId: "b" },
        },
      ],
    );

    expect(useTransportStore.getState().activeCueIds).toEqual(["b"]);
  });

  it("does not debounce when debounce is disabled", () => {
    usePreferencesStore.setState({ midiDebounceMs: 0 });

    handleIncomingMidi([0x90, 60, 127], [goCueMapping]);
    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);

    useTransportStore.getState().stop();
    vi.mocked(performance.now).mockReturnValue(mockNow + 10);
    handleIncomingMidi([0x90, 60, 127], [goCueMapping]);

    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);
  });

  it("debounces low control-change values on the same controller", () => {
    const ccMapping = {
      id: "cc1",
      match: { channel: 1, kind: "control-change" as const, controller: 7, value: 1 },
      action: { type: "go-cue" as const, cueId: "a" },
    };

    handleIncomingMidi([0xb0, 7, 1], [ccMapping]);
    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);

    useTransportStore.getState().stop();
    vi.mocked(performance.now).mockReturnValue(mockNow + 10);
    handleIncomingMidi([0xb0, 7, 1], [ccMapping]);

    expect(useTransportStore.getState().activeCueIds).toEqual([]);
  });

  it("debounces note-off after note-on on the same control", () => {
    const noteOffMapping = {
      id: "off1",
      match: { channel: 1, kind: "note-off" as const, note: 60, velocity: 0 },
      action: { type: "go-cue" as const, cueId: "b" },
    };

    handleIncomingMidi([0x90, 60, 127], [goCueMapping]);
    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);

    useTransportStore.getState().stop();
    vi.mocked(performance.now).mockReturnValue(mockNow + 20);
    handleIncomingMidi([0x80, 60, 0], [goCueMapping, noteOffMapping]);

    expect(useTransportStore.getState().activeCueIds).toEqual([]);
  });

  it("falls back to the default debounce window when preference is invalid", () => {
    usePreferencesStore.setState({ midiDebounceMs: Number.NaN });

    handleIncomingMidi([0x90, 60, 127], [goCueMapping]);
    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);

    useTransportStore.getState().stop();
    vi.mocked(performance.now).mockReturnValue(mockNow + 10);
    handleIncomingMidi([0x90, 60, 127], [goCueMapping]);

    expect(useTransportStore.getState().activeCueIds).toEqual([]);
  });
});

describe("dispatchMidiAction", () => {
  beforeEach(() => {
    resetTestProject([testCue("a", "A", "audio")]);
    resetTransport();
    useProjectStore.getState().selectCue("a");
  });

  it("panics transport", () => {
    useTransportStore.setState({ activeCueIds: ["a"], isPlaying: true });
    dispatchMidiAction({ type: "panic" });
    expect(useTransportStore.getState().activeCueIds).toEqual([]);
  });

  it("GOs the selected cue", () => {
    dispatchMidiAction({ type: "go-selected" });
    expect(useTransportStore.getState().activeCueIds).toContain("a");
  });

  it("selects the previous cue", () => {
    resetTestProject([
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio", { parentId: "g" }),
      testCue("c", "C", "audio"),
    ]);
    useProjectStore.getState().selectCue("c");

    dispatchMidiAction({ type: "previous-cue" });
    expect(activeListSelection()).toEqual(["g"]);
  });

  it("selects the next cue", () => {
    resetTestProject([
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio"),
    ]);
    useProjectStore.getState().selectCue("g");

    dispatchMidiAction({ type: "next-cue" });
    expect(activeListSelection()).toEqual(["b"]);
  });
});

describe("buildNoteToCueMappings", () => {
  beforeEach(() => {
    let n = 0;
    vi.stubGlobal("crypto", { randomUUID: () => `map-${++n}` });
  });

  it("maps top-level cues to sequential notes", () => {
    const cues = [
      testCue("a", "A", "audio"),
      testCue("b", "B", "audio", { parentId: "g" }),
      testCue("c", "C", "audio"),
    ];

    const mappings = buildNoteToCueMappings(cues, 36);

    expect(mappings).toHaveLength(2);
    expect(mappings[0]).toMatchObject({
      match: { channel: 1, kind: "note-on", note: 36, velocity: 127 },
      action: { type: "go-cue", cueId: "a" },
    });
    expect(mappings[1].match.note).toBe(37);
    expect(mappings[1].action).toEqual({ type: "go-cue", cueId: "c" });
  });
});

describe("formatMidiActionLabel", () => {
  it("labels cue actions with cue number and name", () => {
    const cues = [testCue("a", "Intro", "audio", { number: "1" })];
    expect(formatMidiActionLabel({ type: "go-cue", cueId: "a" }, cues)).toBe("GO 1 — Intro");
    expect(formatMidiActionLabel({ type: "go-selected" }, cues)).toBe("GO (selected cue)");
    expect(formatMidiActionLabel({ type: "previous-cue" }, cues)).toBe("Previous cue");
    expect(formatMidiActionLabel({ type: "next-cue" }, cues)).toBe("Next cue");
  });
});
