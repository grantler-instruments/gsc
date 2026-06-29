import { describe, expect, it } from "vitest";
import {
  busEffectiveVolume,
  busRouteWouldCycle,
  clampBusPan,
  createAudioBus,
  normalizeAudioBuses,
  normalizeCueAudioBus,
  resolveBusOutputBusId,
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

describe("normalizeCueAudioBus", () => {
  const buses = [{ id: "b1", name: "Music", volume: 1 }];

  it("leaves audio cues on master by default", () => {
    const cue = {
      id: "c1",
      number: "1",
      name: "Hit",
      type: "audio" as const,
    };
    expect(normalizeCueAudioBus(cue, buses)).toEqual(cue);
  });

  it("keeps a manually assigned bus", () => {
    const cue = {
      id: "c1",
      number: "1",
      name: "Hit",
      type: "video" as const,
      audioBusId: "b1",
    };
    expect(normalizeCueAudioBus(cue, buses)).toEqual(cue);
  });

  it("clears stale bus assignments", () => {
    const cue = {
      id: "c1",
      number: "1",
      name: "Hit",
      type: "audio" as const,
      audioBusId: "missing",
    };
    expect(normalizeCueAudioBus(cue, buses)).toEqual({
      id: "c1",
      number: "1",
      name: "Hit",
      type: "audio",
    });
  });

  it("removes bus assignments from non-routable cues", () => {
    const cue = {
      id: "c1",
      number: "1",
      name: "Look",
      type: "image" as const,
      audioBusId: "b1",
    };
    expect(normalizeCueAudioBus(cue, buses)).toEqual({
      id: "c1",
      number: "1",
      name: "Look",
      type: "image",
    });
  });
});

describe("busEffectiveVolume", () => {
  it("returns zero when muted", () => {
    expect(busEffectiveVolume({ id: "b1", name: "A", volume: 0.8, muted: true })).toBe(0);
  });
});

describe("clampBusPan", () => {
  it("clamps to stereo range", () => {
    expect(clampBusPan(2)).toBe(1);
    expect(clampBusPan(-2)).toBe(-1);
  });
});

describe("resolveBusOutputBusId", () => {
  const buses = [
    { id: "b1", name: "A", volume: 1 },
    { id: "b2", name: "B", volume: 1 },
    { id: "b3", name: "C", volume: 1, outputBusId: "b2" },
  ];

  it("defaults to master output", () => {
    expect(resolveBusOutputBusId({ id: "b1" }, buses)).toBeUndefined();
  });

  it("routes to another bus", () => {
    expect(resolveBusOutputBusId({ id: "b1", outputBusId: "b2" }, buses)).toBe("b2");
  });

  it("rejects self-routing", () => {
    expect(resolveBusOutputBusId({ id: "b1", outputBusId: "b1" }, buses)).toBeUndefined();
  });

  it("rejects cycles", () => {
    const cyclic = [
      { id: "b1", name: "A", volume: 1, outputBusId: "b2" },
      { id: "b2", name: "B", volume: 1, outputBusId: "b1" },
    ];
    expect(resolveBusOutputBusId({ id: "b1", outputBusId: "b2" }, cyclic)).toBeUndefined();
  });
});

describe("normalizeAudioBuses", () => {
  it("clears invalid output routes", () => {
    expect(
      normalizeAudioBuses([
        { id: "b1", name: "A", volume: 1, outputBusId: "missing" },
        { id: "b2", name: "B", volume: 1, outputBusId: "b1" },
      ]),
    ).toEqual([
      { id: "b1", name: "A", volume: 1 },
      { id: "b2", name: "B", volume: 1, outputBusId: "b1" },
    ]);
  });
});

describe("busRouteWouldCycle", () => {
  it("detects direct and indirect loops", () => {
    const buses = [
      { id: "b1", name: "A", volume: 1, outputBusId: "b2" },
      { id: "b2", name: "B", volume: 1, outputBusId: "b3" },
      { id: "b3", name: "C", volume: 1 },
    ];
    expect(busRouteWouldCycle(buses, "b3", "b1")).toBe(true);
    expect(busRouteWouldCycle(buses, "b1", "b2")).toBe(false);
  });
});
