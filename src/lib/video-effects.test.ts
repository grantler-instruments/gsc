import { describe, expect, it } from "vitest";
import {
  busHasVideoEffectType,
  createDefaultVideoBusEffect,
  defaultBlurEffect,
  defaultColorGradeEffect,
  mergeVideoEffectParams,
  normalizeBlurParams,
  normalizeColorGradeParams,
  normalizeVideoEffect,
  reorderVideoEffects,
  videoEffectChainKey,
  videoEffectsEqual,
} from "./video-effects";

describe("normalizeColorGradeParams", () => {
  it("defaults to neutral grade", () => {
    expect(normalizeColorGradeParams(undefined)).toEqual({
      brightness: 0,
      contrast: 1,
      saturation: 1,
    });
  });

  it("clamps grade values", () => {
    expect(normalizeColorGradeParams({ brightness: -2, contrast: 3, saturation: -1 })).toEqual({
      brightness: -1,
      contrast: 2,
      saturation: 0,
    });
  });
});

describe("normalizeBlurParams", () => {
  it("defaults to sensible blur settings", () => {
    expect(normalizeBlurParams(undefined)).toEqual({
      radius: 4,
      mix: 0.5,
    });
  });

  it("clamps blur values", () => {
    expect(normalizeBlurParams({ radius: -1, mix: 2 })).toEqual({
      radius: 0,
      mix: 1,
    });
  });
});

describe("normalizeVideoEffect", () => {
  it("normalizes color grade effects", () => {
    expect(
      normalizeVideoEffect({
        id: "c1",
        type: "colorGrade",
        enabled: false,
        params: { brightness: 0.2, contrast: 1.1, saturation: 0.8 },
      }),
    ).toEqual({
      id: "c1",
      type: "colorGrade",
      enabled: false,
      params: { brightness: 0.2, contrast: 1.1, saturation: 0.8 },
    });
  });

  it("normalizes blur effects", () => {
    expect(
      normalizeVideoEffect({
        id: "b1",
        type: "blur",
        enabled: true,
        params: { radius: 8, mix: 0.25 },
      }),
    ).toEqual({
      id: "b1",
      type: "blur",
      enabled: true,
      params: { radius: 8, mix: 0.25 },
    });
  });
});

describe("createDefaultVideoBusEffect", () => {
  it("creates one effect per type", () => {
    expect(createDefaultVideoBusEffect("colorGrade").type).toBe("colorGrade");
    expect(createDefaultVideoBusEffect("blur").type).toBe("blur");
  });
});

describe("reorderVideoEffects", () => {
  function effects(...ids: string[]) {
    return ids.map((id) => ({ ...defaultColorGradeEffect(), id }));
  }

  it("moves an effect before another", () => {
    const result = reorderVideoEffects(effects("a", "b", "c"), "c", "a", "before");
    expect(result?.map((effect) => effect.id)).toEqual(["c", "a", "b"]);
  });

  it("returns null when dragging onto itself", () => {
    expect(reorderVideoEffects(effects("a", "b"), "a", "a", "before")).toBeNull();
  });
});

describe("busHasVideoEffectType", () => {
  it("detects effect types on a bus", () => {
    const bus = { effects: [defaultColorGradeEffect()] };
    expect(busHasVideoEffectType(bus, "colorGrade")).toBe(true);
    expect(busHasVideoEffectType(bus, "blur")).toBe(false);
  });
});

describe("mergeVideoEffectParams", () => {
  it("merges blur params", () => {
    const blur = createDefaultVideoBusEffect("blur");
    if (blur.type !== "blur") throw new Error("expected blur");
    expect(mergeVideoEffectParams(blur, { mix: 0.75 })).toEqual({
      radius: 4,
      mix: 0.75,
    });
  });
});

describe("videoEffectChainKey", () => {
  it("returns empty string for no effects", () => {
    expect(videoEffectChainKey(undefined)).toBe("");
  });

  it("encodes effect ids and types", () => {
    expect(videoEffectChainKey([{ ...defaultColorGradeEffect(), id: "c1" }])).toBe("c1:colorGrade");
    expect(
      videoEffectChainKey([
        { ...defaultColorGradeEffect(), id: "c1" },
        { ...defaultBlurEffect(), id: "b1" },
      ]),
    ).toBe("c1:colorGrade|b1:blur");
  });
});

describe("videoEffectsEqual", () => {
  it("compares normalized effect chains", () => {
    const a = [{ ...defaultColorGradeEffect(), id: "c1" }];
    const b = [{ ...defaultColorGradeEffect(), id: "c1" }];
    expect(videoEffectsEqual(a, b)).toBe(true);
    expect(videoEffectsEqual(a, [{ ...defaultBlurEffect(), id: "c1" }])).toBe(false);
  });
});
