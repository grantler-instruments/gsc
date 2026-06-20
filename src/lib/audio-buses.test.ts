import { describe, expect, it } from "vitest";
import {
  busEffectiveVolume,
  createAudioBus,
  normalizeAudioBuses,
  resolveCueAudioBusId,
} from "./audio-buses";

describe("normalizeAudioBuses", () => {
  it("returns empty array for undefined", () => {
    expect(normalizeAudioBuses(undefined)).toEqual([]);
  });

  it("clamps volume and trims name", () => {
    expect(
      normalizeAudioBuses([{ id: "b1", name: "  Music  ", volume: 1.5, muted: true }]),
    ).toEqual([{ id: "b1", name: "Music", volume: 1, muted: true }]);
  });
});

describe("createAudioBus", () => {
  it("assigns unique default names", () => {
    const first = createAudioBus([]);
    const second = createAudioBus([first]);
    expect(first.name).not.toBe(second.name);
  });
});

describe("resolveCueAudioBusId", () => {
  const buses = [
    { id: "b1", name: "A", volume: 1 },
    { id: "b2", name: "B", volume: 1 },
  ];

  it("returns undefined when no buses exist", () => {
    expect(resolveCueAudioBusId({ audioBusId: "b1" }, [])).toBeUndefined();
  });

  it("returns undefined when cue has no bus", () => {
    expect(resolveCueAudioBusId({}, buses)).toBeUndefined();
  });

  it("returns bus id when assigned bus exists", () => {
    expect(resolveCueAudioBusId({ audioBusId: "b2" }, buses)).toBe("b2");
  });

  it("returns undefined when assigned bus was removed", () => {
    expect(resolveCueAudioBusId({ audioBusId: "missing" }, buses)).toBeUndefined();
  });
});

describe("busEffectiveVolume", () => {
  it("returns zero when muted", () => {
    expect(busEffectiveVolume({ id: "b1", name: "A", volume: 0.8, muted: true })).toBe(0);
  });
});
