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
