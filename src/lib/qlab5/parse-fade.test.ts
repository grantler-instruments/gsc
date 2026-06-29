import { describe, expect, it } from "vitest";
import { parseFadeCueData } from "./parse-fade";

describe("parseFadeCueData", () => {
  it("reads fade target level from nested FadeValueEntry objects", () => {
    const data = parseFadeCueData({
      $classname: "FadeCue",
      type: "Fade",
      stopTargetWhenDone: true,
      doOpacity: false,
      fade: {
        entries: {
          0: {
            $classname: "FadeValueEntry",
            row: 0,
            column: 0,
            startValue: 1,
            endValue: 0,
          },
        },
        shapes: {
          upShape: {
            shapeEntries: [
              { v: 0, t: 0 },
              { v: 1, t: 1 },
            ],
          },
          downShape: {
            shapeEntries: [
              { v: 1, t: 0 },
              { v: 0, t: 1 },
            ],
          },
        },
      },
    });

    expect(data).toEqual({
      fadeTo: 0,
      fadeFrom: 1,
      stopTargetWhenDone: true,
      opacityFade: false,
    });
  });

  it("falls back to fade-down shape end level when entries are empty", () => {
    const data = parseFadeCueData({
      $classname: "FadeCue",
      type: "Fade",
      stopTargetWhenDone: true,
      fade: {
        entries: { $classname: "NSMutableDictionary" },
        shapes: {
          upShape: {
            shapeEntries: [
              { v: 0, t: 0 },
              { v: 1, t: 1 },
            ],
          },
          downShape: {
            shapeEntries: [
              { v: 1, t: 0 },
              { v: 0, t: 1 },
            ],
          },
        },
      },
    });

    expect(data?.fadeTo).toBe(0);
    expect(data?.stopTargetWhenDone).toBe(true);
  });

  it("detects opacity fades", () => {
    const data = parseFadeCueData({
      type: "Fade",
      doOpacity: true,
      fade: { shapes: {} },
    });
    expect(data?.opacityFade).toBe(true);
  });
});
