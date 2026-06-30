import { describe, expect, it } from "vitest";
import {
  clampAudioMixerHeight,
  DEFAULT_AUDIO_MIXER_HEIGHT,
  MAX_AUDIO_MIXER_HEIGHT,
  MIN_AUDIO_MIXER_HEIGHT,
} from "./audio-mixer-layout";

describe("clampAudioMixerHeight", () => {
  it("defaults within the supported range", () => {
    expect(DEFAULT_AUDIO_MIXER_HEIGHT).toBeGreaterThanOrEqual(MIN_AUDIO_MIXER_HEIGHT);
    expect(DEFAULT_AUDIO_MIXER_HEIGHT).toBeLessThanOrEqual(MAX_AUDIO_MIXER_HEIGHT);
  });

  it("clamps values below the minimum", () => {
    expect(clampAudioMixerHeight(80)).toBe(MIN_AUDIO_MIXER_HEIGHT);
  });

  it("clamps values above the maximum", () => {
    expect(clampAudioMixerHeight(900)).toBeLessThanOrEqual(MAX_AUDIO_MIXER_HEIGHT);
  });
});
