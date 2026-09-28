import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "./ui";

vi.hoisted(() => {
  vi.stubGlobal("window", {
    innerHeight: 900,
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
  });
});

afterAll(() => vi.unstubAllGlobals());

beforeEach(() => {
  useUiStore.setState(useUiStore.getInitialState());
});

describe("shared mixer height", () => {
  it("resizes both docks from either mixer", () => {
    useUiStore.getState().setAudioMixerHeight(420);
    expect(useUiStore.getState()).toMatchObject({
      audioMixerHeight: 420,
      videoOutputHeight: 420,
    });
    useUiStore.getState().setVideoOutputHeight(300);
    expect(useUiStore.getState()).toMatchObject({
      audioMixerHeight: 300,
      videoOutputHeight: 300,
    });
  });

  it("uses the saved audio height when older dock preferences differ", () => {
    const merge = useUiStore.persist.getOptions().merge;
    expect(
      merge?.({ audioMixerHeight: 420, videoOutputHeight: 220 }, useUiStore.getState()),
    ).toMatchObject({ audioMixerHeight: 420, videoOutputHeight: 420 });
  });

  it("clamps both docks to the same bounds", () => {
    useUiStore.getState().setVideoOutputHeight(900);
    expect(useUiStore.getState()).toMatchObject({
      audioMixerHeight: 560,
      videoOutputHeight: 560,
    });
    useUiStore.getState().setAudioMixerHeight(80);
    expect(useUiStore.getState()).toMatchObject({
      audioMixerHeight: 160,
      videoOutputHeight: 160,
    });
  });
});
