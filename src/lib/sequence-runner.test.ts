import { beforeEach, describe, expect, it } from "vitest";
import { useFadeStore } from "../stores/fade";
import { useTransportStore } from "../stores/transport";
import { resetTestProject, testCue } from "../test/fixtures/cues";
import { expandSequenceSteps } from "./cues";
import {
  advanceRunningSequence,
  notifyFadeCueComplete,
  notifyStepPlaybackEnded,
  runSequence,
} from "./sequence-runner";

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

describe("notifyStepPlaybackEnded", () => {
  beforeEach(() => {
    resetTransport();
  });

  it("advances when the only playback cue in the step stops", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("a", "A", "audio", { parentId: "seq", assetPath: "a.wav" }),
      testCue("b", "B", "audio", { parentId: "seq", assetPath: "b.wav" }),
    ];
    resetTestProject(cues);
    useTransportStore.setState({
      activeCueIds: [],
      runningSequence: {
        rootId: "seq",
        currentStep: 0,
        stepCount: 2,
        stepCueIds: ["a"],
        stepStartedAtMs: 0,
      },
    });

    notifyStepPlaybackEnded(["a"]);

    expect(useTransportStore.getState().runningSequence).toMatchObject({
      rootId: "seq",
      currentStep: 1,
      stepCueIds: ["b"],
    });
  });

  it("waits until all parallel playback cues in the step stop", () => {
    const cues = [
      testCue("par", "Par", "group"),
      testCue("a", "A", "audio", { parentId: "par", assetPath: "a.wav" }),
      testCue("b", "B", "audio", { parentId: "par", assetPath: "b.wav" }),
    ];
    resetTestProject(cues);
    useTransportStore.setState({
      activeCueIds: ["b"],
      runningSequence: {
        rootId: "par",
        currentStep: 0,
        stepCount: 1,
        stepCueIds: ["a", "b"],
        stepStartedAtMs: 0,
      },
    });

    notifyStepPlaybackEnded(["a"]);

    expect(useTransportStore.getState().runningSequence?.currentStep).toBe(0);
  });
});

describe("fade-then-stop sequence", () => {
  beforeEach(() => {
    resetTransport();
    useFadeStore.setState({
      fadesByTargetId: {},
      dmxFadesByFadeCueId: {},
      runtimeLevelsByTargetId: {},
      frameMs: 0,
    });
  });

  it("fades audio out on step 1 then stops it on step 2", () => {
    const cues = [
      testCue("seq", "Fade Out And Stop", "sequence"),
      testCue("a", "Loop", "audio", { assetPath: "audio/test.wav" }),
      testCue("fade", "Fade", "volumeFade", {
        parentId: "seq",
        fadeTargetId: "a",
        fadeDuration: 1,
        fadeFrom: 1,
        fadeTo: 0,
      }),
      testCue("stop", "Stop", "stop", {
        parentId: "seq",
        stopTargetId: "a",
      }),
    ];
    resetTestProject(cues);
    useTransportStore.setState({
      activeCueIds: ["a"],
      isPlaying: true,
      cueStartedAtMs: { a: 0 },
    });

    expect(expandSequenceSteps("seq", cues)).toEqual([["fade"], ["stop"]]);

    const result = runSequence(cues[0], cues);
    expect(result).toEqual({ started: true, stepCount: 2 });
    expect(useTransportStore.getState().runningSequence).toMatchObject({
      rootId: "seq",
      currentStep: 0,
      stepCueIds: ["fade"],
    });
    expect(useFadeStore.getState().fadesByTargetId.a).toMatchObject({
      property: "volume",
      to: 0,
    });
    expect(useTransportStore.getState().activeCueIds).toContain("a");

    notifyFadeCueComplete("fade", cues);

    expect(useTransportStore.getState().runningSequence).toMatchObject({
      rootId: "seq",
      currentStep: 1,
      stepCueIds: ["stop"],
    });
    expect(useTransportStore.getState().activeCueIds).not.toContain("a");
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
