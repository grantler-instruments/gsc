import { describe, expect, it } from "vitest";
import {
  appendCueInList,
  buildCueTree,
  expandSequenceSteps,
  getChildCues,
  renumberCueList,
  reorderSiblingCues,
  resolveParallelGoIds,
} from "./cues";
import { testCue } from "../test/fixtures/cues";

describe("renumberCueList", () => {
  it("numbers top-level cues sequentially", () => {
    const cues = [
      testCue("a", "A", "audio"),
      testCue("b", "B", "audio"),
    ];
    const numbered = renumberCueList(cues);
    expect(numbered.map((c) => c.number)).toEqual(["1", "2"]);
  });

  it("numbers nested cues under containers", () => {
    const cues = [
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio", { parentId: "g" }),
    ];
    const numbered = renumberCueList(cues);
    const group = numbered.find((c) => c.id === "g");
    const childA = numbered.find((c) => c.id === "a");
    expect(group?.number).toBe("1");
    expect(childA?.number).toBe("1.1");
  });
});

describe("buildCueTree", () => {
  it("nests children under container cues", () => {
    const cues = [
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio"),
    ];
    const tree = buildCueTree(cues);
    expect(tree).toHaveLength(2);
    expect(tree[0].cue.id).toBe("g");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].cue.id).toBe("a");
    expect(tree[1].cue.id).toBe("b");
  });
});

describe("appendCueInList", () => {
  it("inserts after the last sibling with the same parent", () => {
    const cues = [
      testCue("a", "A", "audio"),
      testCue("b", "B", "audio"),
    ];
    const inserted = appendCueInList(cues, testCue("c", "C", "audio"));
    expect(inserted.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("inserts at end of parent group siblings", () => {
    const cues = [
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("x", "X", "audio"),
    ];
    const inserted = appendCueInList(
      cues,
      testCue("b", "B", "audio", { parentId: "g" }),
    );
    const ids = inserted.map((c) => c.id);
    expect(ids.indexOf("b")).toBeGreaterThan(ids.indexOf("a"));
    expect(ids.indexOf("b")).toBeLessThan(ids.indexOf("x"));
  });
});

describe("reorderSiblingCues", () => {
  const cues = [
    testCue("a", "A", "audio"),
    testCue("b", "B", "audio"),
    testCue("c", "C", "audio"),
  ];

  it("moves a cue before a sibling", () => {
    const next = reorderSiblingCues(cues, "c", "a", "before");
    expect(next?.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });

  it("returns null for cues with different parents", () => {
    const nested = [
      ...cues,
      testCue("d", "D", "audio", { parentId: "g" }),
      testCue("g", "Group", "group"),
    ];
    expect(reorderSiblingCues(nested, "a", "d", "before")).toBeNull();
  });
});

describe("expandSequenceSteps", () => {
  it("creates one step per sequential child", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("a", "A", "audio", { parentId: "seq" }),
      testCue("b", "B", "audio", { parentId: "seq" }),
    ];
    expect(expandSequenceSteps("seq", cues)).toEqual([["a"], ["b"]]);
  });

  it("fires parallel group children in one step", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("par", "Par", "group", { parentId: "seq" }),
      testCue("a", "A", "audio", { parentId: "par" }),
      testCue("b", "B", "audio", { parentId: "par" }),
    ];
    expect(expandSequenceSteps("seq", cues)).toEqual([["a", "b"]]);
  });

  it("skips utility cues inside parallel groups", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("par", "Par", "group", { parentId: "seq" }),
      testCue("a", "A", "audio", { parentId: "par" }),
      testCue("stop", "Stop", "stop", {
        parentId: "par",
        stopTargetId: "a",
      }),
    ];
    expect(expandSequenceSteps("seq", cues)).toEqual([["a"]]);
  });
});

describe("resolveParallelGoIds", () => {
  it("returns nested sequence ids without expanding them", () => {
    const cues = [
      testCue("par", "Par", "group"),
      testCue("seq", "Seq", "sequence", { parentId: "par" }),
      testCue("a", "A", "audio", { parentId: "seq" }),
    ];
    expect(resolveParallelGoIds(cues.find((c) => c.id === "par")!, cues)).toEqual(
      ["seq"],
    );
  });

  it("returns a single cue id for non-group cues", () => {
    const cue = testCue("a", "A", "audio");
    expect(resolveParallelGoIds(cue, [cue])).toEqual(["a"]);
  });
});

describe("getChildCues", () => {
  it("returns direct children only", () => {
    const cues = [
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio", { parentId: "g" }),
      testCue("c", "C", "audio"),
    ];
    expect(getChildCues(cues, "g").map((c) => c.id)).toEqual(["a", "b"]);
  });
});
