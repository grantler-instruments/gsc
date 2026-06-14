import { describe, expect, it } from "vitest";
import { testCue } from "../test/fixtures/cues";
import { reparentCueRelative, reparentCueToListEnd } from "./cue-reparent";

describe("reparentCueRelative", () => {
  it("reorders siblings without changing parent", () => {
    const cues = [testCue("a", "A", "audio"), testCue("b", "B", "audio")];
    const result = reparentCueRelative(cues, "b", "a", "before");
    expect(result?.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("moves a nested cue out after its container", () => {
    const cues = [
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio", { parentId: "g" }),
      testCue("c", "C", "audio"),
    ];

    const result = reparentCueRelative(cues, "a", "g", "after");
    if (!result) throw new Error("Expected reparent result");

    expect(result.find((c) => c.id === "a")?.parentId).toBeUndefined();
    expect(result.filter((c) => !c.parentId).map((c) => c.id)).toEqual(["g", "a", "c"]);
  });

  it("moves a nested cue before a top-level sibling", () => {
    const cues = [
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("c", "C", "audio"),
    ];

    const result = reparentCueRelative(cues, "a", "c", "before");
    if (!result) throw new Error("Expected reparent result");

    expect(result.find((c) => c.id === "a")?.parentId).toBeUndefined();
    expect(result.filter((c) => !c.parentId).map((c) => c.id)).toEqual(["g", "a", "c"]);
  });

  it("moves a cue into the middle of a group", () => {
    const cues = [
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio", { parentId: "g" }),
      testCue("x", "X", "audio"),
    ];

    const result = reparentCueRelative(cues, "x", "b", "before");
    if (!result) throw new Error("Expected reparent result");

    expect(result.find((c) => c.id === "x")?.parentId).toBe("g");
    expect(result.filter((c) => c.parentId === "g").map((c) => c.id)).toEqual(["a", "x", "b"]);
  });

  it("inserts a cue before a nested sequence inside a parallel group", () => {
    const cues = [
      testCue("p", "Parallel", "group"),
      testCue("s", "Sequence", "sequence", { parentId: "p" }),
      testCue("x", "X", "audio"),
    ];

    const result = reparentCueRelative(cues, "x", "s", "before");
    if (!result) throw new Error("Expected reparent result");

    expect(result.find((c) => c.id === "x")?.parentId).toBe("p");
    expect(result.filter((c) => c.parentId === "p").map((c) => c.id)).toEqual(["x", "s"]);
  });
});

describe("reparentCueToListEnd", () => {
  it("moves a nested cue to the end of the top-level list", () => {
    const cues = [
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("c", "C", "audio"),
    ];

    const result = reparentCueToListEnd(cues, "a");
    if (!result) throw new Error("Expected reparent result");

    expect(result.find((c) => c.id === "a")?.parentId).toBeUndefined();
    expect(result.filter((c) => !c.parentId).map((c) => c.id)).toEqual(["g", "c", "a"]);
  });

  it("returns null when the cue is already the last top-level cue", () => {
    const cues = [testCue("a", "A", "audio"), testCue("b", "B", "audio")];
    expect(reparentCueToListEnd(cues, "b")).toBeNull();
  });
});
