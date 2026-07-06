import { describe, expect, it } from "vitest";
import {
  busEffectiveOpacity,
  createVideoBus,
  normalizeCueVideoBus,
  normalizeMasterVideoOutputName,
  normalizeVideoBuses,
  resolveCueVideoBusId,
  serializeMasterVideoOutputName,
} from "./video-buses";

describe("normalizeVideoBuses", () => {
  it("returns empty array for undefined", () => {
    expect(normalizeVideoBuses(undefined)).toEqual([]);
  });

  it("clamps opacity and trims name", () => {
    expect(
      normalizeVideoBuses([{ id: "b1", name: "  Stage  ", opacity: 1.5, muted: true }]),
    ).toEqual([{ id: "b1", name: "Stage", opacity: 1, muted: true }]);
  });
});

describe("createVideoBus", () => {
  it("assigns unique default names", () => {
    const first = createVideoBus([]);
    const second = createVideoBus([first]);
    expect(first.name).not.toBe(second.name);
  });
});

describe("resolveCueVideoBusId", () => {
  const buses = [
    { id: "b1", name: "Main screen", opacity: 1 },
    { id: "b2", name: "Lobby", opacity: 1 },
  ];

  it("returns undefined when no buses exist", () => {
    expect(resolveCueVideoBusId({ videoBusId: "b1" }, [])).toBeUndefined();
  });

  it("returns undefined when cue has no bus", () => {
    expect(resolveCueVideoBusId({}, buses)).toBeUndefined();
  });

  it("returns bus id when assigned bus exists", () => {
    expect(resolveCueVideoBusId({ videoBusId: "b2" }, buses)).toBe("b2");
  });

  it("returns undefined when assigned bus was removed", () => {
    expect(resolveCueVideoBusId({ videoBusId: "missing" }, buses)).toBeUndefined();
  });
});

describe("normalizeCueVideoBus", () => {
  const buses = [{ id: "b1", name: "Stage", opacity: 1 }];

  it("leaves visual cues on master by default", () => {
    const cue = {
      id: "c1",
      number: "1",
      name: "Look",
      type: "video" as const,
    };
    expect(normalizeCueVideoBus(cue, buses)).toEqual(cue);
  });

  it("keeps a manually assigned bus on video cues", () => {
    const cue = {
      id: "c1",
      number: "1",
      name: "Clip",
      type: "video" as const,
      videoBusId: "b1",
    };
    expect(normalizeCueVideoBus(cue, buses)).toEqual(cue);
  });

  it("keeps a manually assigned bus on image cues", () => {
    const cue = {
      id: "c1",
      number: "1",
      name: "Slide",
      type: "image" as const,
      videoBusId: "b1",
    };
    expect(normalizeCueVideoBus(cue, buses)).toEqual(cue);
  });

  it("clears stale bus assignments", () => {
    const cue = {
      id: "c1",
      number: "1",
      name: "Clip",
      type: "video" as const,
      videoBusId: "missing",
    };
    expect(normalizeCueVideoBus(cue, buses)).toEqual({
      id: "c1",
      number: "1",
      name: "Clip",
      type: "video",
    });
  });

  it("removes bus assignments from non-visual cues", () => {
    const cue = {
      id: "c1",
      number: "1",
      name: "Hit",
      type: "audio" as const,
      videoBusId: "b1",
    };
    expect(normalizeCueVideoBus(cue, buses)).toEqual({
      id: "c1",
      number: "1",
      name: "Hit",
      type: "audio",
    });
  });
});

describe("busEffectiveOpacity", () => {
  it("returns zero when muted", () => {
    expect(busEffectiveOpacity({ id: "b1", name: "A", opacity: 0.8, muted: true })).toBe(0);
  });

  it("returns clamped opacity when not muted", () => {
    expect(busEffectiveOpacity({ id: "b1", name: "A", opacity: 0.75 })).toBe(0.75);
    expect(busEffectiveOpacity({ id: "b1", name: "A", opacity: 1.5 })).toBe(1);
  });
});

describe("master video output name", () => {
  it("defaults to Main", () => {
    expect(normalizeMasterVideoOutputName(undefined)).toBe("Main");
    expect(normalizeMasterVideoOutputName("")).toBe("Main");
  });

  it("trims custom names", () => {
    expect(normalizeMasterVideoOutputName("  House  ")).toBe("House");
  });

  it("omits default name from snapshots", () => {
    expect(serializeMasterVideoOutputName("Main")).toBeUndefined();
    expect(serializeMasterVideoOutputName("House")).toBe("House");
  });
});
