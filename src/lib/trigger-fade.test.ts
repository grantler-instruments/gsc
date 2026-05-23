import { beforeEach, describe, expect, it } from "vitest";
import { resolveEffectiveVolume, useFadeStore } from "../stores/fade";
import { useTransportStore } from "../stores/transport";
import { activeCues, resetTestProject, testCue } from "../test/fixtures/cues";

describe("property fade completion", () => {
  beforeEach(() => {
    resetTestProject([testCue("v", "Video", "video", { volume: 1 })]);
    useFadeStore.setState({
      fadesByTargetId: {},
      dmxFadesByFadeCueId: {},
      runtimeLevelsByTargetId: {},
      frameMs: 0,
    });
    useTransportStore.setState({
      isPlaying: false,
      activeCueId: null,
      activeCueIds: [],
      cueStartedAtMs: {},
      runningSequence: null,
      masterVolume: 1,
    });
  });

  it("keeps the faded volume at runtime without changing the cue", () => {
    const startedAtMs = 1000;
    useFadeStore.getState().startFade({
      targetId: "v",
      property: "volume",
      from: 1,
      to: 0.25,
      startedAtMs,
      durationSec: 2,
    });

    useFadeStore.getState().tick(startedAtMs + 2000);

    expect(useFadeStore.getState().fadesByTargetId.v).toBeUndefined();
    expect(useFadeStore.getState().runtimeLevelsByTargetId.v?.volume).toBe(0.25);
    expect(activeCues().find((c) => c.id === "v")?.volume).toBe(1);
    expect(resolveEffectiveVolume("v", 1)).toBe(0.25);
  });

  it("restores the cue's stored volume when triggered again", () => {
    useFadeStore.getState().setRuntimeLevel("v", "volume", 0.25);

    useTransportStore.getState().go("v");

    expect(useFadeStore.getState().runtimeLevelsByTargetId.v).toBeUndefined();
    expect(resolveEffectiveVolume("v", 1)).toBe(1);
  });
});
