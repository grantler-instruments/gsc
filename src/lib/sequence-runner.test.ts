import { beforeEach, describe, expect, it } from "vitest";
import { useTransportStore } from "../stores/transport";
import { testCue } from "../test/fixtures/cues";
import { advanceRunningSequence, notifyFadeCueComplete, runSequence } from "./sequence-runner";

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

describe("runSequence", () => {
  beforeEach(() => {
    resetTransport();
  });

  it("returns started false for empty sequences", () => {
    const seq = testCue("seq", "Seq", "sequence");
    expect(runSequence(seq, [seq])).toEqual({
      started: false,
      stepCount: 0,
    });
  });

  it("starts a running sequence for sequential children", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("a", "A", "audio", { parentId: "seq" }),
      testCue("b", "B", "audio", { parentId: "seq" }),
    ];

    const result = runSequence(cues[0], cues);
    expect(result).toEqual({ started: true, stepCount: 2 });
    expect(useTransportStore.getState().runningSequence).toMatchObject({
      rootId: "seq",
      currentStep: 0,
      stepCount: 2,
      stepCueIds: ["a"],
    });
  });
});

describe("notifyFadeCueComplete", () => {
  beforeEach(() => {
    resetTransport();
  });

  it("advances fade-only steps when the fade cue completes", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("fade", "Fade", "volumeFade", {
        parentId: "seq",
        fadeTargetId: "a",
        fadeDuration: 1,
      }),
      testCue("a", "A", "audio", { parentId: "seq" }),
    ];

    useTransportStore.setState({
      runningSequence: {
        rootId: "seq",
        currentStep: 0,
        stepCount: 2,
        stepCueIds: ["fade"],
        stepStartedAtMs: 0,
      },
    });

    notifyFadeCueComplete("fade", cues);

    expect(useTransportStore.getState().runningSequence).toMatchObject({
      rootId: "seq",
      currentStep: 1,
      stepCueIds: ["a"],
    });
  });

  it("does not advance when the step includes other cues", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("fade", "Fade", "volumeFade", {
        parentId: "seq",
        fadeTargetId: "a",
      }),
      testCue("a", "A", "audio", { parentId: "seq" }),
    ];

    useTransportStore.setState({
      runningSequence: {
        rootId: "seq",
        currentStep: 0,
        stepCount: 1,
        stepCueIds: ["fade", "a"],
        stepStartedAtMs: 0,
      },
    });

    notifyFadeCueComplete("fade", cues);

    expect(useTransportStore.getState().runningSequence?.currentStep).toBe(0);
  });
});

describe("advanceRunningSequence", () => {
  beforeEach(() => {
    resetTransport();
  });

  it("clears the running sequence after the last step", () => {
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

    advanceRunningSequence(cues);
    expect(useTransportStore.getState().runningSequence).toBeNull();
  });
});
