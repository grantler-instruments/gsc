import { describe, expect, it } from "vitest";
import { clamp01, clampPan } from "./clamp";

describe("clamp01", () => {
  it("clamps to 0–1", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1.5)).toBe(1);
  });
});

describe("clampPan", () => {
  it("clamps to -1–1", () => {
    expect(clampPan(-2)).toBe(-1);
    expect(clampPan(0)).toBe(0);
    expect(clampPan(2)).toBe(1);
  });
});
