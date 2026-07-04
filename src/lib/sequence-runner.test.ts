import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTransportStore } from "../stores/transport";
import { resetTestProject, testCue } from "../test/fixtures/cues";
import {
  advanceRunningSequence,
  cueCompletesViaAudioEngine,
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

describe("notifyStepPlaybackEnded idempotency", () => {
  beforeEach(() => {
    resetTransport();
  });

  it("does not double-advance when called twice for the same step", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("a", "A", "audio", { parentId: "seq", assetPath: "a.wav" }),
      testCue("b", "B", "audio", { parentId: "seq", assetPath: "b.wav" }),
      testCue("c", "C", "audio", { parentId: "seq", assetPath: "c.wav" }),
    ];
    resetTestProject(cues);
    useTransportStore.setState({
      activeCueIds: [],
      runningSequence: {
        rootId: "seq",
        currentStep: 0,
        stepCount: 3,
        stepCueIds: ["a"],
        stepStartedAtMs: 0,
      },
    });

    notifyStepPlaybackEnded(["a"]);
    notifyStepPlaybackEnded(["a"]);

    expect(useTransportStore.getState().runningSequence).toMatchObject({
      rootId: "seq",
      currentStep: 1,
      stepCueIds: ["b"],
    });
  });
});

describe("completeSequenceStep idempotency", () => {
  beforeEach(() => {
    resetTransport();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ignores a stale step timer after playback-end already advanced", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("a", "A", "audio", { parentId: "seq", assetPath: "a.wav" }),
      testCue("b", "B", "audio", { parentId: "seq", assetPath: "b.wav" }),
    ];
    resetTestProject(cues);
    runSequence(cues[0], cues);

    expect(useTransportStore.getState().runningSequence?.currentStep).toBe(0);

    useTransportStore.setState({ activeCueIds: [] });
    notifyStepPlaybackEnded(["a"]);

    expect(useTransportStore.getState().runningSequence).toMatchObject({
      currentStep: 1,
      stepCueIds: ["b"],
    });

    // Step-0 fallback timer would fire here on the old runner and re-enter step 1.
    vi.advanceTimersByTime(500);

    expect(useTransportStore.getState().runningSequence).toMatchObject({
      currentStep: 1,
      stepCueIds: ["b"],
    });
  });
});

describe("cueCompletesViaAudioEngine", () => {
  it("is true for audio and video cues only", () => {
    expect(cueCompletesViaAudioEngine(testCue("a", "A", "audio"))).toBe(true);
    expect(cueCompletesViaAudioEngine(testCue("v", "V", "video"))).toBe(true);
    expect(cueCompletesViaAudioEngine(testCue("i", "I", "image"))).toBe(false);
    expect(cueCompletesViaAudioEngine(testCue("m", "M", "midi"))).toBe(false);
  });
});
