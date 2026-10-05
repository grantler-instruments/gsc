import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCueList } from "../lib/cue-lists";
import { testCue } from "../test/fixtures/cues";
import { useProjectStore } from "./project";
import { useTransportStore } from "./transport";

const faded = testCue("faded", "Faded", "audio", { assetPath: "a.wav", fadeOut: 2 });
const plain = testCue("plain", "Plain", "audio", { assetPath: "b.wav" });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000);
  useProjectStore.setState({
    cueLists: [{ ...createCueList("Main"), id: "main", cues: [faded, plain] }],
    activeCueListId: "main",
  });
  useTransportStore.getState().panic();
  useTransportStore.getState().goMany([faded.id, plain.id]);
});

afterEach(() => {
  useTransportStore.getState().panic();
  vi.useRealTimers();
});

describe("releaseMany", () => {
  it("keeps a cue with a fade out active until the fade ends", () => {
    useTransportStore.getState().releaseMany([faded.id, plain.id]);
    let state = useTransportStore.getState();
    expect(state.activeCueIds).toEqual([faded.id]);
    expect(state.releasingCues[faded.id]).toEqual({ startedAtMs: 1_000, durationSec: 2 });

    vi.advanceTimersByTime(1_999);
    expect(useTransportStore.getState().activeCueIds).toEqual([faded.id]);

    vi.advanceTimersByTime(1);
    state = useTransportStore.getState();
    expect(state.activeCueIds).toEqual([]);
    expect(state.releasingCues).toEqual({});
  });

  it("cuts a cue that is already fading out when stopped again", () => {
    useTransportStore.getState().releaseMany([faded.id]);
    useTransportStore.getState().releaseMany([faded.id]);
    const state = useTransportStore.getState();
    expect(state.activeCueIds).toEqual([plain.id]);
    expect(state.releasingCues).toEqual({});
  });

  it("cancels the fading stop when the cue is fired again", () => {
    useTransportStore.getState().releaseMany([faded.id]);
    useTransportStore.getState().go(faded.id);
    vi.advanceTimersByTime(5_000);
    const state = useTransportStore.getState();
    expect(state.activeCueIds).toContain(faded.id);
    expect(state.releasingCues).toEqual({});
  });

  it("fades out on stop all but cuts on panic", () => {
    useTransportStore.getState().stop();
    expect(useTransportStore.getState().activeCueIds).toEqual([faded.id]);
    useTransportStore.getState().panic();
    const state = useTransportStore.getState();
    expect(state.activeCueIds).toEqual([]);
    expect(state.releasingCues).toEqual({});
  });
});
