import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildNoteToCueMappings,
  dispatchMidiAction,
  formatMidiActionLabel,
  handleIncomingMidi,
} from "./midi-mapping";
import { useTransportStore } from "../stores/transport";
import { useProjectStore } from "../stores/project";
import {
  resetTestProject,
  testCue,
} from "../test/fixtures/cues";

function activeListSelection(): string[] {
  const { cueLists, activeCueListId } = useProjectStore.getState();
  return (
    cueLists.find((l) => l.id === activeCueListId)?.selectedCueIds ?? []
  );
}

function resetTransport() {
  useTransportStore.setState({
    isPlaying: false,
    activeCueId: null,
    activeCueIds: [],
    cueStartedAtMs: {},
    runningSequence: null,
    masterVolume: 1,
  });
}

let mockNow = 10_000;

describe("handleIncomingMidi", () => {
  beforeEach(() => {
    mockNow += 1000;
    resetTestProject([testCue("a", "A", "audio"), testCue("b", "B", "audio")]);
    resetTransport();
    vi.spyOn(performance, "now").mockReturnValue(mockNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores note-on with zero velocity", () => {
    handleIncomingMidi([0x90, 60, 0], [
      {
        id: "m1",
        match: { channel: 1, kind: "note-on", note: 60, velocity: 127 },
        action: { type: "select-cue", cueId: "a" },
      },
    ]);

    expect(activeListSelection()).toEqual([]);
  });

  it("dispatches the first enabled matching mapping", () => {
    handleIncomingMidi([0x90, 60, 127], [
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
    ]);

    expect(activeListSelection()).toEqual(["a"]);
  });

  it("skips disabled mappings", () => {
    handleIncomingMidi([0x90, 60, 127], [
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
    ]);

    expect(activeListSelection()).toEqual(["b"]);
  });

  it("debounces identical messages within 50ms", () => {
    handleIncomingMidi([0x90, 60, 127], [
      {
        id: "m1",
        match: { channel: 1, kind: "note-on", note: 60, velocity: 127 },
        action: { type: "go-cue", cueId: "a" },
      },
    ]);
    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);

    useTransportStore.getState().stop();
    vi.mocked(performance.now).mockReturnValue(mockNow + 10);

    handleIncomingMidi([0x90, 60, 127], [
      {
        id: "m1",
        match: { channel: 1, kind: "note-on", note: 60, velocity: 127 },
        action: { type: "go-cue", cueId: "a" },
      },
    ]);

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
    expect(formatMidiActionLabel({ type: "go-cue", cueId: "a" }, cues)).toBe(
      "GO 1 — Intro",
    );
    expect(formatMidiActionLabel({ type: "go-selected" }, cues)).toBe(
      "GO (selected cue)",
    );
  });
});
