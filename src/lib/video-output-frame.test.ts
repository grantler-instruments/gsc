import { describe, expect, it } from "vitest";
import { homographyFromCorrespondences, UNIT_SQUARE_GL } from "./output-frame-homography";
import {
  defaultNormalizedQuad,
  defaultVideoOutputFrame,
  isIdentityVideoOutputFrame,
  normalizeNormalizedRect,
  normalizeVideoOutputFrame,
  quadToBoundingRect,
  rectToQuad,
} from "./video-output-frame";

describe("normalizeVideoOutputFrame", () => {
  it("defaults to full crop and placement quads", () => {
    expect(normalizeVideoOutputFrame(undefined)).toEqual(defaultVideoOutputFrame());
    expect(isIdentityVideoOutputFrame(defaultVideoOutputFrame())).toBe(true);
  });

  it("migrates legacy rects to quads", () => {
    expect(
      normalizeVideoOutputFrame({
        crop: { x: 0.9, y: 0.9, w: 0.5, h: 0.5 },
        dest: { x: -0.2, y: 0, w: 1, h: 1 },
      }),
    ).toEqual({
      crop: rectToQuad({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 }),
      dest: defaultNormalizedQuad(),
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

  it("round-trips quad bounding rects", () => {
    const rect = { x: 0.1, y: 0.2, w: 0.4, h: 0.5 };
    const roundTrip = quadToBoundingRect(rectToQuad(rect));
    expect(roundTrip.x).toBe(rect.x);
    expect(roundTrip.y).toBe(rect.y);
    expect(roundTrip.w).toBe(rect.w);
    expect(roundTrip.h).toBeCloseTo(rect.h, 10);
  });
});

describe("homographyFromCorrespondences", () => {
  it("maps the unit square to itself", () => {
    const h = homographyFromCorrespondences(UNIT_SQUARE_GL, UNIT_SQUARE_GL);
    for (let i = 0; i < 9; i += 1) {
      const expected = i === 0 || i === 4 || i === 8 ? 1 : 0;
      expect(h[i]).toBeCloseTo(expected, 5);
    }
  });
});
