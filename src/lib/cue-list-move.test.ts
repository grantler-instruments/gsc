import { describe, expect, it } from "vitest";
import { createCueList } from "./cue-lists";
import { moveCueBetweenLists } from "./cue-list-move";
import { testCue } from "../test/fixtures/cues";

describe("moveCueBetweenLists", () => {
  it("moves a top-level cue from sequence to hot list", () => {
    const main = createCueList("Main", "sequence");
    main.cues = [testCue("a", "A", "audio"), testCue("b", "B", "audio")];
    const hot = createCueList("Hot", "hot");

    const result = moveCueBetweenLists([main, hot], "a", hot.id, { kind: "append" });
    expect(result).not.toBeNull();
    const nextMain = result?.cueLists.find((l) => l.id === main.id);
    const nextHot = result?.cueLists.find((l) => l.id === hot.id);
    expect(nextMain?.cues.map((c) => c.id)).toEqual(["b"]);
    expect(nextHot?.cues.map((c) => c.id)).toEqual(["a"]);
    expect(nextHot?.cues[0]?.parentId).toBeUndefined();
  });

  it("moves a cue from hot list onto a sequence row", () => {
    const main = createCueList("Main", "sequence");
    main.cues = [testCue("a", "A", "audio"), testCue("b", "B", "audio")];
    const hot = createCueList("Hot", "hot");
    hot.cues = [testCue("h1", "Sting", "audio")];

    const result = moveCueBetweenLists([main, hot], "h1", main.id, {
      kind: "before",
      cueId: "b",
    });
    expect(result).not.toBeNull();
    const nextMain = result?.cueLists.find((l) => l.id === main.id);
    const nextHot = result?.cueLists.find((l) => l.id === hot.id);
    expect(nextMain?.cues.map((c) => c.id)).toEqual(["a", "h1", "b"]);
    expect(nextHot?.cues).toEqual([]);
  });

  it("moves a hot cue into a sequence group", () => {
    const main = createCueList("Main", "sequence");
    main.cues = [testCue("g", "Group", "group"), testCue("a", "A", "audio")];
    const hot = createCueList("Hot", "hot");
    hot.cues = [testCue("h1", "Sting", "audio")];

    const result = moveCueBetweenLists([main, hot], "h1", main.id, {
      kind: "into-group",
      groupId: "g",
    });
    expect(result).not.toBeNull();
    const nextMain = result?.cueLists.find((l) => l.id === main.id);
    expect(nextMain?.cues.find((c) => c.id === "h1")?.parentId).toBe("g");
    const nextHot = result?.cueLists.find((l) => l.id === hot.id);
    expect(nextHot?.cues).toEqual([]);
  });
});
