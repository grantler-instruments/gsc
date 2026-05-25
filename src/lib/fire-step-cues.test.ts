import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFadeStore } from "../stores/fade";
import { useTransportStore } from "../stores/transport";
import { testCue } from "../test/fixtures/cues";
import { fireStepCues, playbackCueIdsInStep } from "./fire-step-cues";

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

describe("fireStepCues", () => {
  beforeEach(() => {
    resetTransport();
    useFadeStore.setState({ fadesByTargetId: {}, dmxFadesByFadeCueId: {}, frameMs: 0 });
    vi.mocked(sendDmxUniverses).mockClear();
  });

  it("GOs playback cues in a step", () => {
    const cues = [testCue("a", "A", "audio"), testCue("b", "B", "audio")];
    const actions = mockActions();

    fireStepCues(["a", "b"], cues, actions);

    expect(actions.goMany).toHaveBeenCalledWith(["a", "b"]);
  });

  it("skips wait cues without GO", () => {
    const cues = [testCue("w", "Wait", "wait"), testCue("a", "A", "audio")];
    const actions = mockActions();

    fireStepCues(["w", "a"], cues, actions);

    expect(actions.goMany).toHaveBeenCalledWith(["a"]);
  });

  it("stops the target of a stop cue in the step", () => {
    const cues = [
      testCue("a", "A", "audio"),
      testCue("stop", "Stop", "stop", { stopTargetId: "a" }),
    ];
    const actions = mockActions();

    fireStepCues(["stop"], cues, actions);

    expect(actions.stopMany).toHaveBeenCalledWith(["a"]);
    expect(actions.goMany).not.toHaveBeenCalled();
  });

  it("starts fades for fade cues in the step", () => {
    const cues = [
      testCue("a", "A", "audio"),
      testCue("fade", "Fade", "volumeFade", {
        fadeTargetId: "a",
        fadeDuration: 2,
        fadeTo: 0.5,
      }),
    ];
    const actions = mockActions();

    fireStepCues(["fade"], cues, actions);

    expect(useFadeStore.getState().fadesByTargetId.a).toMatchObject({
      property: "volume",
      to: 0.5,
    });
    expect(actions.goMany).not.toHaveBeenCalled();
  });

  it("fires light cues in the step without GO", () => {
    const cues = [
      testCue("l", "Look", "dmx", {
        dmx: { mode: "snapshot", fixtures: [] },
      }),
    ];
    const actions = mockActions();

    fireStepCues(["l"], cues, actions);

    expect(sendDmxUniverses).toHaveBeenCalledOnce();
    expect(actions.goMany).not.toHaveBeenCalled();
  });

  it("delegates nested sequences to runSequence", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("a", "A", "audio", { parentId: "seq" }),
    ];
    const actions = mockActions();
    const runSequence = vi.fn();

    fireStepCues(["seq"], cues, actions, { runSequence });

    expect(runSequence).toHaveBeenCalledWith(cues[0], cues);
    expect(actions.goMany).not.toHaveBeenCalled();
  });

  it("GOs leaf children from a parallel group in the step", () => {
    const cues = [
      testCue("par", "Par", "group"),
      testCue("a", "A", "audio", { parentId: "par" }),
      testCue("b", "B", "audio", { parentId: "par" }),
    ];
    const actions = mockActions();

    fireStepCues(["par"], cues, actions);

    expect(actions.goMany).toHaveBeenCalledWith(["a", "b"]);
  });

  it("applies first-wins inside a parallel group in the step", () => {
    const cues = [
      testCue("par", "Par", "group"),
      testCue("stop", "Stop", "stop", {
        parentId: "par",
        stopTargetId: "a",
      }),
      testCue("a", "A", "audio", { parentId: "par" }),
    ];
    const actions = mockActions();

    fireStepCues(["par"], cues, actions);

    expect(actions.stopMany).toHaveBeenCalledWith(["a"]);
    expect(actions.goMany).not.toHaveBeenCalled();
  });

  it("clears running sequence when stopping a sequence target", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("a", "A", "audio", { parentId: "seq" }),
      testCue("stop", "Stop", "stop", { stopTargetId: "seq" }),
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
    const actions = mockActions();

    fireStepCues(["stop"], cues, actions);

    expect(useTransportStore.getState().runningSequence).toBeNull();
    expect(actions.stopMany).toHaveBeenCalledWith(["seq", "a"]);
  });
});

describe("playbackCueIdsInStep", () => {
  const cues = [
    testCue("a", "A", "audio"),
    testCue("fade", "Fade", "volumeFade", { fadeTargetId: "a" }),
    testCue("w", "Wait", "wait"),
    testCue("par", "Par", "group"),
    testCue("stop", "Stop", "stop", { stopTargetId: "a" }),
  ];

  it("keeps only playback cues", () => {
    expect(playbackCueIdsInStep(["a", "fade", "w", "par", "stop"], cues)).toEqual(["a"]);
  });

  it("ignores missing cue ids", () => {
    expect(playbackCueIdsInStep(["missing", "a"], cues)).toEqual(["a"]);
  });
});
