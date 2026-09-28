import { describe, expect, it } from "vitest";
import { objectFitContainUv } from "./video-compositor";

describe("objectFitContainUv", () => {
  it("maps center pixel through unchanged when aspects match", () => {
    const result = objectFitContainUv([0.5, 0.5], [1920, 1080], [1920, 1080]);
    expect(result.visible).toBe(true);
    expect(result.uv[0]).toBeCloseTo(0.5);
    expect(result.uv[1]).toBeCloseTo(0.5);
  });

  it("letterboxes a wider source", () => {
    const result = objectFitContainUv([0.5, 0.5], [1920, 1080], [1000, 1000]);
    expect(result.visible).toBe(true);
    expect(result.uv[0]).toBeCloseTo(0.5);
    expect(result.uv[1]).toBeCloseTo(0.5);
  });

  it("marks pillarbox margins as not visible", () => {
    const result = objectFitContainUv([0.02, 0.5], [1080, 1920], [1920, 1080]);
    expect(result.visible).toBe(false);
  });
});
