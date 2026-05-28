import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFadeStore } from "../stores/fade";
import { useTransportStore } from "../stores/transport";
import { testCue } from "../test/fixtures/cues";
import { triggerGo, triggerStopCue } from "./trigger";

vi.mock("../platform/send-dmx", () => ({
  sendDmxUniverses: vi.fn(),
}));

import { sendDmxUniverses } from "../platform/send-dmx";

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

function mockActions() {
  return {
    go: vi.fn<(id: string) => void>(),
    goMany: vi.fn<(ids: string[]) => void>(),
    stopMany: vi.fn<(ids: string[]) => void>(),
  };
}

describe("triggerGo", () => {
  beforeEach(() => {
    resetTransport();
    useFadeStore.setState({ fadesByTargetId: {}, dmxFadesByFadeCueId: {}, frameMs: 0 });
    vi.mocked(sendDmxUniverses).mockClear();
  });

  it("GOs a leaf cue", () => {
    const cue = testCue("a", "A", "audio");
    const actions = mockActions();

    const result = triggerGo(cue, [cue], actions);

    expect(result).toEqual({ triggered: ["a"], emptyContainer: false });
    expect(actions.go).toHaveBeenCalledWith("a");
    expect(actions.goMany).not.toHaveBeenCalled();
    expect(actions.stopMany).not.toHaveBeenCalled();
  });

  it("GOs midi as a pulse (leaves actives immediately after fire)", () => {
    const cue = testCue("m", "M", "midi");
    const actions = mockActions();

    const result = triggerGo(cue, [cue], actions);

    expect(result).toEqual({ triggered: ["m"], emptyContainer: false });
    expect(actions.go).toHaveBeenCalledWith("m");
    expect(actions.stopMany).toHaveBeenCalledWith(["m"]);
  });

  it("stops the target of a stop cue", () => {
    const cues = [
      testCue("a", "A", "audio"),
      testCue("stop", "Stop", "stop", { stopTargetId: "a" }),
    ];
    const actions = mockActions();

    const result = triggerGo(cues[1], cues, actions);

    expect(result).toEqual({ triggered: [], emptyContainer: false });
    expect(actions.stopMany).toHaveBeenCalledWith(["a"]);
  });

  it("reports empty container when stop cue has no target", () => {
    const stop = testCue("stop", "Stop", "stop");
    const actions = mockActions();

    const result = triggerGo(stop, [stop], actions);

    expect(result).toEqual({ triggered: [], emptyContainer: true });
    expect(actions.stopMany).not.toHaveBeenCalled();
  });

  it("does nothing for wait cues", () => {
    const wait = testCue("w", "Wait", "wait", { waitDurationSec: 2 });
    const actions = mockActions();

    const result = triggerGo(wait, [wait], actions);

    expect(result).toEqual({ triggered: [], emptyContainer: false });
    expect(actions.go).not.toHaveBeenCalled();
  });

  it("starts a fade on a valid fade target", () => {
    const cues = [
      testCue("a", "A", "audio", { volume: 1 }),
      testCue("fade", "Fade", "volumeFade", {
        fadeTargetId: "a",
        fadeDuration: 3,
        fadeTo: 0,
      }),
    ];
    const actions = mockActions();

    const result = triggerGo(cues[1], cues, actions);

    expect(result).toEqual({ triggered: [], emptyContainer: false });
    expect(useFadeStore.getState().fadesByTargetId.a).toMatchObject({
      targetId: "a",
      property: "volume",
      to: 0,
      durationSec: 3,
    });
  });

  it("fires light cues without adding them to transport", () => {
    const cues = [
      testCue("l", "Look", "dmx", {
        dmx: { mode: "snapshot", fixtures: [] },
      }),
    ];
    const actions = mockActions();

    const result = triggerGo(cues[0], cues, actions);

    expect(result).toEqual({ triggered: [], emptyContainer: false });
    expect(sendDmxUniverses).toHaveBeenCalledOnce();
    expect(actions.go).not.toHaveBeenCalled();
    expect(actions.goMany).not.toHaveBeenCalled();
  });

  it("starts a sequence and reports empty when it has no steps", () => {
    const seq = testCue("seq", "Seq", "sequence");
    const actions = mockActions();

    const result = triggerGo(seq, [seq], actions);

    expect(result).toEqual({ triggered: [], emptyContainer: true });
    expect(useTransportStore.getState().runningSequence).toBeNull();
  });

  it("GOs parallel group leaf children together", () => {
    const cues = [
      testCue("par", "Par", "group"),
      testCue("a", "A", "audio", { parentId: "par" }),
      testCue("b", "B", "audio", { parentId: "par" }),
    ];
    const actions = mockActions();

    const result = triggerGo(cues[0], cues, actions);

    expect(result).toEqual({ triggered: ["a", "b"], emptyContainer: false });
    expect(actions.goMany).toHaveBeenCalledWith(["a", "b"]);
  });

  it("reports empty parallel group with no children", () => {
    const par = testCue("par", "Par", "group");
    const actions = mockActions();

    const result = triggerGo(par, [par], actions);

    expect(result).toEqual({ triggered: [], emptyContainer: true });
    expect(actions.goMany).not.toHaveBeenCalled();
  });

  it("fires nested stop cues inside a parallel group when stop is first", () => {
    const cues = [
      testCue("par", "Par", "group"),
      testCue("stop", "Stop", "stop", {
        parentId: "par",
        stopTargetId: "a",
      }),
      testCue("a", "A", "audio", { parentId: "par" }),
    ];
    const actions = mockActions();

    triggerGo(cues[0], cues, actions);

    expect(actions.stopMany).toHaveBeenCalledWith(["a"]);
    expect(actions.goMany).not.toHaveBeenCalled();
  });

  it("GOs playback when listed before a stop on the same target", () => {
    const cues = [
      testCue("par", "Par", "group"),
      testCue("a", "A", "audio", { parentId: "par" }),
      testCue("stop", "Stop", "stop", {
        parentId: "par",
        stopTargetId: "a",
      }),
    ];
    const actions = mockActions();

    triggerGo(cues[0], cues, actions);

    expect(actions.goMany).toHaveBeenCalledWith(["a"]);
    expect(actions.stopMany).not.toHaveBeenCalled();
  });
});

describe("triggerStopCue", () => {
  beforeEach(() => {
    resetTransport();
  });

  it("stops a leaf cue", () => {
    const cue = testCue("a", "A", "audio");
    const stopMany = vi.fn<(ids: string[]) => void>();

    triggerStopCue(cue, [cue], stopMany);

    expect(stopMany).toHaveBeenCalledWith(["a"]);
  });

  it("stops a container and all descendants", () => {
    const cues = [
      testCue("par", "Par", "group"),
      testCue("a", "A", "audio", { parentId: "par" }),
      testCue("b", "B", "audio", { parentId: "par" }),
    ];
    const stopMany = vi.fn<(ids: string[]) => void>();

    triggerStopCue(cues[0], cues, stopMany);

    expect(stopMany).toHaveBeenCalledWith(["par", "a", "b"]);
  });

  it("cancels running sequences when stopping a sequence container", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("a", "A", "audio", { parentId: "seq" }),
    ];
    useTransportStore.setState({
      runningSequence: {
        rootId: "seq",
        currentStep: 0,
        stepCount: 1,
        stepCueIds: ["a"],
        stepStartedAtMs: 0,
      },
    });
    const stopMany = vi.fn<(ids: string[]) => void>();

    triggerStopCue(cues[0], cues, stopMany);

    expect(useTransportStore.getState().runningSequence).toBeNull();
    expect(stopMany).toHaveBeenCalledWith(["seq", "a"]);
  });
});
