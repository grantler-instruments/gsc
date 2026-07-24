import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFadeStore } from "../stores/fade";
import { useTransportStore } from "../stores/transport";
import { resetTestProject, testCue } from "../test/fixtures/cues";
import { expandSequenceSteps } from "./cues";
import {
  advanceRunningSequence,
  cancelSequence,
  cueCompletesViaAudioEngine,
  notifyFadeCueComplete,
  notifyStepPlaybackEnded,
  runSequence,
  tryAdvanceSequenceIfStepPlaybackInactive,
} from "./sequence-runner";

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
    expect(useTransportStore.getState().runningSequences.seq).toMatchObject({
      rootId: "seq",
      currentStep: 0,
      stepCount: 2,
      stepCueIds: ["a"],
      scope: "main",
    });
  });

  it("runs an overlay sequence without cancelling a main sequence", () => {
    const mainCues = [
      testCue("main", "Main", "sequence"),
      testCue("m1", "M1", "audio", { parentId: "main" }),
      testCue("m2", "M2", "audio", { parentId: "main" }),
    ];
    const hotCues = [
      testCue("hot", "Hot", "sequence"),
      testCue("h1", "H1", "audio", { parentId: "hot" }),
      testCue("h2", "H2", "audio", { parentId: "hot" }),
    ];

    runSequence(mainCues[0], mainCues, { scope: "main" });
    runSequence(hotCues[0], hotCues, { scope: "overlay" });

    const running = useTransportStore.getState().runningSequences;
    expect(running.main).toMatchObject({ rootId: "main", scope: "main" });
    expect(running.hot).toMatchObject({ rootId: "hot", scope: "overlay" });
  });

  it("runs two overlay sequences concurrently", () => {
    const hotA = [
      testCue("hot-a", "Hot A", "sequence"),
      testCue("ha1", "HA1", "audio", { parentId: "hot-a" }),
    ];
    const hotB = [
      testCue("hot-b", "Hot B", "sequence"),
      testCue("hb1", "HB1", "audio", { parentId: "hot-b" }),
    ];

    runSequence(hotA[0], hotA, { scope: "overlay" });
    runSequence(hotB[0], hotB, { scope: "overlay" });

    const running = useTransportStore.getState().runningSequences;
    expect(running["hot-a"]).toMatchObject({ rootId: "hot-a", scope: "overlay" });
    expect(running["hot-b"]).toMatchObject({ rootId: "hot-b", scope: "overlay" });
  });

  it("main GO cancels another main sequence but leaves overlay sequences", () => {
    const seqA = [testCue("a", "A", "sequence"), testCue("a1", "A1", "audio", { parentId: "a" })];
    const seqB = [testCue("b", "B", "sequence"), testCue("b1", "B1", "audio", { parentId: "b" })];
    const hot = [testCue("h", "H", "sequence"), testCue("h1", "H1", "audio", { parentId: "h" })];

    runSequence(hot[0], hot, { scope: "overlay" });
    runSequence(seqA[0], seqA, { scope: "main" });
    runSequence(seqB[0], seqB, { scope: "main" });

    const running = useTransportStore.getState().runningSequences;
    expect(running.a).toBeUndefined();
    expect(running.b).toMatchObject({ rootId: "b", scope: "main" });
    expect(running.h).toMatchObject({ rootId: "h", scope: "overlay" });
  });

  it("cancelSequence stops an overlay sequence without affecting main playback", () => {
    const hotCues = [
      testCue("hseq", "Hot Seq", "sequence"),
      testCue("h1", "H1", "audio", { parentId: "hseq" }),
      testCue("h2", "H2", "audio", { parentId: "hseq" }),
    ];

    useTransportStore.getState().go("a");
    runSequence(hotCues[0], hotCues, { scope: "overlay" });

    expect(useTransportStore.getState().activeCueIds).toEqual(["a", "h1"]);
    expect(useTransportStore.getState().runningSequences.hseq).toBeDefined();

    cancelSequence("hseq");

    expect(useTransportStore.getState().runningSequences.hseq).toBeUndefined();
    expect(useTransportStore.getState().activeCueIds).toEqual(["a", "h1"]);
    expect(useTransportStore.getState().isPlaying).toBe(true);
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
      runningSequences: {
        seq: {
          rootId: "seq",
          currentStep: 0,
          stepCount: 2,
          stepCueIds: ["fade"],
          stepStartedAtMs: 0,
          scope: "main",
        },
      },
    });

    notifyFadeCueComplete("fade", cues);

    expect(useTransportStore.getState().runningSequences.seq).toMatchObject({
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
      runningSequences: {
        seq: {
          rootId: "seq",
          currentStep: 0,
          stepCount: 1,
          stepCueIds: ["fade", "a"],
          stepStartedAtMs: 0,
          scope: "main",
        },
      },
    });

    notifyFadeCueComplete("fade", cues);

    expect(useTransportStore.getState().runningSequences.seq?.currentStep).toBe(0);
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
      runningSequences: {
        seq: {
          rootId: "seq",
          currentStep: 0,
          stepCount: 2,
          stepCueIds: ["a"],
          stepStartedAtMs: 0,
          scope: "main",
        },
      },
    });

    notifyStepPlaybackEnded(["a"]);

    expect(useTransportStore.getState().runningSequences.seq).toMatchObject({
      rootId: "seq",
      currentStep: 1,
      stepCueIds: ["b"],
    });
    expect(useTransportStore.getState().activeCueIds).toContain("b");
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
      runningSequences: {
        par: {
          rootId: "par",
          currentStep: 0,
          stepCount: 1,
          stepCueIds: ["a", "b"],
          stepStartedAtMs: 0,
          scope: "main",
        },
      },
    });

    notifyStepPlaybackEnded(["a"]);

    expect(useTransportStore.getState().runningSequences.par?.currentStep).toBe(0);
  });

  it("completing an overlay sequence leaves main playback active", () => {
    const cues = [
      testCue("a", "A", "audio", { assetPath: "a.wav" }),
      testCue("hseq", "Hot Seq", "sequence"),
      testCue("h1", "H1", "audio", { parentId: "hseq", assetPath: "h1.wav" }),
    ];
    resetTestProject(cues);
    useTransportStore.setState({
      activeCueIds: ["a"],
      isPlaying: true,
      activeCueId: "a",
      runningSequences: {
        hseq: {
          rootId: "hseq",
          currentStep: 0,
          stepCount: 1,
          stepCueIds: ["h1"],
          stepStartedAtMs: 0,
          scope: "overlay",
        },
      },
    });

    notifyStepPlaybackEnded(["h1"]);

    expect(useTransportStore.getState().runningSequences.hseq).toBeUndefined();
    expect(useTransportStore.getState().activeCueIds).toContain("a");
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
    expect(useTransportStore.getState().runningSequences.seq).toMatchObject({
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

    expect(useTransportStore.getState().runningSequences.seq).toMatchObject({
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
      runningSequences: {
        seq: {
          rootId: "seq",
          currentStep: 0,
          stepCount: 1,
          stepCueIds: ["a"],
          stepStartedAtMs: 0,
          scope: "main",
        },
      },
    });

    advanceRunningSequence("seq", cues);
    expect(useTransportStore.getState().runningSequences).toEqual({});
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

  it("does not double-advance when notify is called twice for the same step", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("a", "A", "audio", { parentId: "seq", assetPath: "a.wav" }),
      testCue("b", "B", "audio", { parentId: "seq", assetPath: "b.wav" }),
    ];
    resetTestProject(cues);
    useTransportStore.setState({
      activeCueIds: [],
      runningSequences: {
        seq: {
          rootId: "seq",
          currentStep: 0,
          stepCount: 2,
          stepCueIds: ["a"],
          stepStartedAtMs: 0,
          scope: "main",
        },
      },
    });

    notifyStepPlaybackEnded(["a"]);
    notifyStepPlaybackEnded(["a"]);

    expect(useTransportStore.getState().runningSequences.seq).toMatchObject({
      rootId: "seq",
      currentStep: 1,
      stepCueIds: ["b"],
    });
  });

  it("schedules a timer for wait-only steps", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("a", "A", "audio", { parentId: "seq", assetPath: "a.wav" }),
      testCue("w", "Wait", "wait", { parentId: "seq", waitDurationSec: 2 }),
      testCue("b", "B", "audio", { parentId: "seq", assetPath: "b.wav" }),
    ];
    resetTestProject(cues);

    runSequence(cues[0], cues);
    useTransportStore.setState({ activeCueIds: [] });
    notifyStepPlaybackEnded(["a"]);

    expect(useTransportStore.getState().runningSequences.seq).toMatchObject({
      currentStep: 1,
      stepCueIds: ["w"],
    });
    expect(useTransportStore.getState().activeCueIds).toEqual([]);

    vi.advanceTimersByTime(2000);

    expect(useTransportStore.getState().runningSequences.seq).toMatchObject({
      currentStep: 2,
      stepCueIds: ["b"],
    });
    expect(useTransportStore.getState().activeCueIds).toContain("b");
  });

  it("ignores a stale step timer after playback-end already advanced", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("a", "A", "audio", { parentId: "seq", assetPath: "a.wav" }),
      testCue("b", "B", "audio", { parentId: "seq", assetPath: "b.wav" }),
    ];
    resetTestProject(cues);
    runSequence(cues[0], cues);

    expect(useTransportStore.getState().runningSequences.seq?.currentStep).toBe(0);

    useTransportStore.setState({ activeCueIds: [] });
    notifyStepPlaybackEnded(["a"]);

    expect(useTransportStore.getState().runningSequences.seq).toMatchObject({
      currentStep: 1,
      stepCueIds: ["b"],
    });

    // Step-0 fallback timer would fire here on the old runner and re-enter step 1.
    vi.advanceTimersByTime(500);

    expect(useTransportStore.getState().runningSequences.seq).toMatchObject({
      currentStep: 1,
      stepCueIds: ["b"],
    });
  });
});

describe("nested sequences", () => {
  beforeEach(() => {
    resetTransport();
  });

  it("advances when step playback cues are all inactive", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("a", "A", "audio", { parentId: "seq", assetPath: "a.wav" }),
      testCue("b", "B", "audio", { parentId: "seq", assetPath: "b.wav" }),
    ];
    resetTestProject(cues);
    useTransportStore.setState({
      activeCueIds: [],
      runningSequences: {
        seq: {
          rootId: "seq",
          currentStep: 0,
          stepCount: 2,
          stepCueIds: ["a"],
          stepStartedAtMs: 0,
          scope: "main",
        },
      },
    });

    tryAdvanceSequenceIfStepPlaybackInactive();

    expect(useTransportStore.getState().runningSequences.seq).toMatchObject({
      currentStep: 1,
      stepCueIds: ["b"],
    });
    expect(useTransportStore.getState().activeCueIds).toContain("b");
  });

  it("does not drop playback-end notification when runningSequence is set before firing", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("a", "A", "audio", { parentId: "seq", assetPath: "a.wav" }),
      testCue("b", "B", "audio", { parentId: "seq", assetPath: "b.wav" }),
    ];
    resetTestProject(cues);

    runSequence(cues[0], cues);
    expect(useTransportStore.getState().runningSequences.seq).toMatchObject({
      rootId: "seq",
      currentStep: 0,
      stepCueIds: ["a"],
    });

    useTransportStore.setState({ activeCueIds: [] });
    notifyStepPlaybackEnded(["a"]);

    expect(useTransportStore.getState().runningSequences.seq).toMatchObject({
      currentStep: 1,
      stepCueIds: ["b"],
    });
  });

  it("runs a child sequence without the parent overwriting runningSequence", () => {
    const cues = [
      testCue("root", "Root Seq", "sequence"),
      testCue("mid", "Mid Par", "group", { parentId: "root" }),
      testCue("inner", "Inner Seq", "sequence", { parentId: "mid" }),
      testCue("a", "A", "audio", { parentId: "inner", assetPath: "a.wav" }),
      testCue("b", "B", "audio", { parentId: "inner", assetPath: "b.wav" }),
    ];
    resetTestProject(cues);

    runSequence(cues[0], cues);

    expect(useTransportStore.getState().runningSequences.inner).toMatchObject({
      rootId: "inner",
      currentStep: 0,
      stepCueIds: ["a"],
      parent: { rootId: "root", stepIndex: 0 },
    });
    expect(useTransportStore.getState().activeCueIds).toContain("a");

    useTransportStore.setState({ activeCueIds: [] });
    notifyStepPlaybackEnded(["a"]);

    expect(useTransportStore.getState().runningSequences.inner).toMatchObject({
      rootId: "inner",
      currentStep: 1,
      stepCueIds: ["b"],
      parent: { rootId: "root", stepIndex: 0 },
    });
    expect(useTransportStore.getState().activeCueIds).toContain("b");

    useTransportStore.setState({ activeCueIds: [] });
    notifyStepPlaybackEnded(["b"]);

    expect(useTransportStore.getState().runningSequences.inner).toBeUndefined();
    expect(useTransportStore.getState().runningSequences.root).toBeUndefined();
    expect(useTransportStore.getState().activeCueIds).toEqual([]);
  });

  it("resumes the parent sequence after a nested child finishes", () => {
    const cues = [
      testCue("root", "Root Seq", "sequence"),
      testCue("mid", "Mid Par", "group", { parentId: "root" }),
      testCue("inner", "Inner Seq", "sequence", { parentId: "mid" }),
      testCue("a", "A", "audio", { parentId: "inner", assetPath: "a.wav" }),
    ];
    resetTestProject(cues);

    runSequence(cues[0], cues);
    useTransportStore.setState({ activeCueIds: [] });
    notifyStepPlaybackEnded(["a"]);

    expect(useTransportStore.getState().runningSequences.inner).toBeUndefined();
    expect(useTransportStore.getState().runningSequences.root).toBeUndefined();
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
