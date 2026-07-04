import { describe, expect, it } from "vitest";
import {
  defaultVideoOutputFrame,
  isIdentityVideoOutputFrame,
  normalizeNormalizedRect,
  normalizeVideoOutputFrame,
} from "./video-output-frame";

describe("normalizeVideoOutputFrame", () => {
  it("defaults to full crop and placement", () => {
    expect(normalizeVideoOutputFrame(undefined)).toEqual(defaultVideoOutputFrame());
    expect(isIdentityVideoOutputFrame(defaultVideoOutputFrame())).toBe(true);
  });

  it("clamps rects inside the canvas", () => {
    expect(
      normalizeVideoOutputFrame({
        crop: { x: 0.9, y: 0.9, w: 0.5, h: 0.5 },
        dest: { x: -0.2, y: 0, w: 1, h: 1 },
      }),
    ).toEqual({
      crop: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
      dest: { x: 0, y: 0, w: 1, h: 1 },
    });
  });

  it("keeps minimum rect size", () => {
    expect(normalizeNormalizedRect({ x: 0, y: 0, w: 0, h: 0 })).toEqual({
      x: 0,
      y: 0,
      w: 0.02,
      h: 0.02,
    });
  });
});
