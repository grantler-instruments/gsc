import { describe, expect, it } from "vitest";
import {
  busHasEffectType,
  clampEqGainDb,
  createDefaultBusEffect,
  defaultEqEffect,
  effectChainKey,
  getBusEqEffect,
  mergeEffectParams,
  normalizeAudioEffect,
  normalizeDelayParams,
  normalizeEqParams,
  normalizeReverbParams,
} from "./audio-effects";

describe("normalizeEqParams", () => {
  it("defaults to flat response", () => {
    expect(normalizeEqParams(undefined)).toEqual({
      lowGain: 0,
      midGain: 0,
      highGain: 0,
    });
  });

  it("clamps gain values", () => {
    expect(normalizeEqParams({ lowGain: -20, midGain: 0, highGain: 20 })).toEqual({
      lowGain: -12,
      midGain: 0,
      highGain: 12,
    });
  });
});

describe("normalizeDelayParams", () => {
  it("defaults to sensible delay settings", () => {
    expect(normalizeDelayParams(undefined)).toEqual({
      timeSec: 0.25,
      feedback: 0.35,
      mix: 0.25,
    });
  });

  it("clamps delay values", () => {
    expect(normalizeDelayParams({ timeSec: 0, feedback: 2, mix: -1 })).toEqual({
      timeSec: 0.05,
      feedback: 0.9,
      mix: 0,
    });
  });
});

describe("normalizeReverbParams", () => {
  it("defaults to sensible reverb settings", () => {
    expect(normalizeReverbParams(undefined)).toEqual({
      decaySec: 1.5,
      mix: 0.3,
    });
  });

  it("clamps reverb values", () => {
    expect(normalizeReverbParams({ decaySec: 10, mix: 2 })).toEqual({
      decaySec: 4,
      mix: 1,
    });
  });
});

describe("normalizeAudioEffect", () => {
  it("normalizes eq effects", () => {
    expect(
      normalizeAudioEffect({
        id: "e1",
        type: "eq",
        enabled: false,
        params: { lowGain: 3, midGain: -2, highGain: 6 },
      }),
    ).toEqual({
      id: "e1",
      type: "eq",
      enabled: false,
      params: { lowGain: 3, midGain: -2, highGain: 6 },
    });
  });

  it("normalizes delay effects", () => {
    expect(
      normalizeAudioEffect({
        id: "d1",
        type: "delay",
        enabled: true,
        params: { timeSec: 0.5, feedback: 0.4, mix: 0.2 },
      }),
    ).toEqual({
      id: "d1",
      type: "delay",
      enabled: true,
      params: { timeSec: 0.5, feedback: 0.4, mix: 0.2 },
    });
  });

  it("normalizes reverb effects", () => {
    expect(
      normalizeAudioEffect({
        id: "r1",
        type: "reverb",
        enabled: true,
        params: { decaySec: 2, mix: 0.5 },
      }),
    ).toEqual({
      id: "r1",
      type: "reverb",
      enabled: true,
      params: { decaySec: 2, mix: 0.5 },
    });
  });
});

describe("createDefaultBusEffect", () => {
  it("creates one effect per type", () => {
    expect(createDefaultBusEffect("eq").type).toBe("eq");
    expect(createDefaultBusEffect("delay").type).toBe("delay");
    expect(createDefaultBusEffect("reverb").type).toBe("reverb");
  });
});

describe("busHasEffectType", () => {
  it("detects effect types on a bus", () => {
    const bus = { effects: [defaultEqEffect()] };
    expect(busHasEffectType(bus, "eq")).toBe(true);
    expect(busHasEffectType(bus, "delay")).toBe(false);
  });
});

describe("mergeEffectParams", () => {
  it("merges delay params", () => {
    const delay = createDefaultBusEffect("delay");
    if (delay.type !== "delay") throw new Error("expected delay");
    expect(mergeEffectParams(delay, { mix: 0.5 })).toEqual({
      timeSec: 0.25,
      feedback: 0.35,
      mix: 0.5,
    });
  });
});

describe("effectChainKey", () => {
  it("returns empty string for no effects", () => {
    expect(effectChainKey(undefined)).toBe("");
  });

  it("encodes effect ids and types", () => {
    expect(effectChainKey([{ ...defaultEqEffect(), id: "e1" }])).toBe("e1:eq");
    expect(
      effectChainKey([
        { ...defaultEqEffect(), id: "e1" },
        { ...createDefaultBusEffect("delay"), id: "d1" },
      ]),
    ).toBe("e1:eq|d1:delay");
  });
});

describe("getBusEqEffect", () => {
  it("finds eq on a bus", () => {
    const eq = defaultEqEffect();
    expect(getBusEqEffect({ effects: [eq] })).toEqual(eq);
  });
});

describe("clampEqGainDb", () => {
  it("clamps to eq range", () => {
    expect(clampEqGainDb(99)).toBe(12);
    expect(clampEqGainDb(-99)).toBe(-12);
  });
});
