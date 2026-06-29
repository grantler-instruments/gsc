import { beforeEach, describe, expect, it, vi } from "vitest";
import { testCue } from "../test/fixtures/cues";
import {
  buildParallelGroupFromSelection,
  canGroupSelectedCues,
  flattenVisibleCueIds,
  getPrimarySelectedCueId,
  isCueDescendantOf,
  ungroupContainerCue,
} from "./cue-selection";

describe("getPrimarySelectedCueId", () => {
  it("returns null for an empty selection", () => {
    expect(getPrimarySelectedCueId([])).toBeNull();
  });

  it("returns the last selected cue id", () => {
    expect(getPrimarySelectedCueId(["a", "b", "c"])).toBe("c");
  });
});

describe("flattenVisibleCueIds", () => {
  const cues = [
    testCue("g", "Group", "group"),
    testCue("a", "A", "audio", { parentId: "g" }),
    testCue("b", "B", "audio", { parentId: "g" }),
    testCue("c", "C", "audio"),
  ];

  it("includes nested cues when the container is expanded", () => {
    expect(flattenVisibleCueIds(cues, new Set())).toEqual(["g", "a", "b", "c"]);
  });

  it("hides nested cues when the container is collapsed", () => {
    expect(flattenVisibleCueIds(cues, new Set(["g"]))).toEqual(["g", "c"]);
  });
});

describe("isCueDescendantOf", () => {
  const cues = [
    testCue("g", "Group", "group"),
    testCue("s", "Seq", "sequence", { parentId: "g" }),
    testCue("a", "A", "audio", { parentId: "s" }),
    testCue("x", "X", "audio"),
  ];

  it("detects direct and nested descendants", () => {
    expect(isCueDescendantOf(cues, "g", "a")).toBe(true);
    expect(isCueDescendantOf(cues, "g", "s")).toBe(true);
  });

  it("returns false for siblings and unrelated cues", () => {
    expect(isCueDescendantOf(cues, "g", "x")).toBe(false);
    expect(isCueDescendantOf(cues, "s", "g")).toBe(false);
  });
});

describe("canGroupSelectedCues", () => {
  const cues = [
    testCue("g", "Group", "group"),
    testCue("a", "A", "audio", { parentId: "g" }),
    testCue("b", "B", "audio", { parentId: "g" }),
    testCue("c", "C", "audio"),
    testCue("d", "D", "audio"),
  ];

  it("requires at least two selected cues", () => {
    expect(canGroupSelectedCues(["a"], cues)).toEqual({ ok: false });
  });

  it("requires siblings under the same parent", () => {
    expect(canGroupSelectedCues(["a", "c"], cues)).toEqual({ ok: false });
  });

  it("rejects selecting a container and its descendant", () => {
    expect(canGroupSelectedCues(["g", "a"], cues)).toEqual({ ok: false });
  });

  it("allows grouping siblings", () => {
    expect(canGroupSelectedCues(["a", "b"], cues)).toEqual({
      ok: true,
      parentId: "g",
    });
    expect(canGroupSelectedCues(["c", "d"], cues)).toEqual({
      ok: true,
      parentId: undefined,
    });
  });
});

describe("buildParallelGroupFromSelection", () => {
  beforeEach(() => {
    let n = 0;
    vi.stubGlobal("crypto", {
      randomUUID: () => `uuid-${++n}`,
    });
  });

  it("returns null when grouping is not allowed", () => {
    const cues = [testCue("a", "A", "audio"), testCue("b", "B", "audio")];
    expect(buildParallelGroupFromSelection(["a"], cues)).toBeNull();
  });

  it("wraps selected siblings in a new group", () => {
    const cues = [
      testCue("a", "A", "audio"),
      testCue("b", "B", "audio"),
      testCue("c", "C", "audio"),
    ];

    const result = buildParallelGroupFromSelection(["a", "b"], cues, "My Group");
    if (!result) throw new Error("Expected grouped result");

    const group = result.find((c) => c.type === "group");
    expect(group?.id).toBe("uuid-1");
    expect(group?.name).toBe("My Group");

    const a = result.find((c) => c.id === "a");
    const b = result.find((c) => c.id === "b");
    expect(a?.parentId).toBe("uuid-1");
    expect(b?.parentId).toBe("uuid-1");

    const ids = result.map((c) => c.id);
    expect(ids.indexOf("uuid-1")).toBeLessThan(ids.indexOf("c"));
  });
});

describe("ungroupContainerCue", () => {
  it("returns null for non-container cues", () => {
    const cues = [testCue("a", "A", "audio")];
    expect(ungroupContainerCue(cues, "a")).toBeNull();
  });

  it("promotes children and removes the container", () => {
    const cues = [
      testCue("x", "X", "audio"),
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio", { parentId: "g" }),
      testCue("y", "Y", "audio"),
    ];

    const result = ungroupContainerCue(cues, "g");
    if (!result) throw new Error("Expected ungrouped result");

    expect(result.some((c) => c.id === "g")).toBe(false);
    expect(result.find((c) => c.id === "a")?.parentId).toBeUndefined();
    expect(result.find((c) => c.id === "b")?.parentId).toBeUndefined();

    const topLevelIds = result.filter((c) => !c.parentId).map((c) => c.id);
    expect(topLevelIds).toEqual(["x", "a", "b", "y"]);
  });

  it("promotes children to the parent container level", () => {
    const cues = [
      testCue("s", "Seq", "sequence"),
      testCue("g", "Group", "group", { parentId: "s" }),
      testCue("a", "A", "audio", { parentId: "g" }),
    ];

    const result = ungroupContainerCue(cues, "g");
    if (!result) throw new Error("Expected ungrouped result");

    expect(result.find((c) => c.id === "a")?.parentId).toBe("s");
    expect(result.filter((c) => c.parentId === "s").map((c) => c.id)).toEqual(["a"]);
  });

  it("removes an empty container", () => {
    const cues = [testCue("a", "A", "audio"), testCue("g", "Group", "group")];
    const result = ungroupContainerCue(cues, "g");
    if (!result) throw new Error("Expected ungrouped result");

    expect(result.map((c) => c.id)).toEqual(["a"]);
  });
});
