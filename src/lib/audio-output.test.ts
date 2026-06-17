import { describe, expect, it } from "vitest";
import {
  canPanOutputRoute,
  DEFAULT_OUTPUT_CHANNELS,
  normalizeCueOutputChannels,
  outputChannelsEqual,
  resolveOutputChannels,
} from "./audio-output";

describe("resolveOutputChannels", () => {
  it("defaults to the first stereo pair", () => {
    expect(resolveOutputChannels({})).toEqual([...DEFAULT_OUTPUT_CHANNELS]);
  });

  it("uses explicit channels when set", () => {
    expect(resolveOutputChannels({ outputChannels: [3, 4] })).toEqual([3, 4]);
  });

  it("supports mono routes", () => {
    expect(resolveOutputChannels({ outputChannels: [5] })).toEqual([5]);
  });
});

describe("normalizeCueOutputChannels", () => {
  it("clears default stereo routing", () => {
    expect(normalizeCueOutputChannels([1, 2], 8)).toBeUndefined();
  });

  it("clamps channels to the device maximum", () => {
    expect(normalizeCueOutputChannels([3, 12], 8)).toEqual([3, 8]);
  });

  it("keeps non-default routes", () => {
    expect(normalizeCueOutputChannels([5, 6], 8)).toEqual([5, 6]);
  });
});

describe("outputChannelsEqual", () => {
  it("compares channel order", () => {
    expect(outputChannelsEqual([1, 2], [1, 2])).toBe(true);
    expect(outputChannelsEqual([1, 2], [2, 1])).toBe(false);
  });
});

describe("canPanOutputRoute", () => {
  it("allows pan only for stereo routes", () => {
    expect(canPanOutputRoute([1, 2])).toBe(true);
    expect(canPanOutputRoute([3])).toBe(false);
  });
});
