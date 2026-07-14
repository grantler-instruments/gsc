import { describe, expect, it } from "vitest";
import { createCueList, nextCueListName, reorderCueLists, uniqueCueListName } from "./cue-lists";

function lists(...names: string[]) {
  return names.map((name) => ({ ...createCueList(name), id: name }));
}

describe("reorderCueLists", () => {
  it("moves a list before another", () => {
    const result = reorderCueLists(lists("a", "b", "c"), "c", "a", "before");
    expect(result?.map((l) => l.id)).toEqual(["c", "a", "b"]);
  });

  it("moves a list after another", () => {
    const result = reorderCueLists(lists("a", "b", "c"), "a", "c", "after");
    expect(result?.map((l) => l.id)).toEqual(["b", "c", "a"]);
  });

  it("returns null when dragging onto itself", () => {
    expect(reorderCueLists(lists("a", "b"), "a", "a", "before")).toBeNull();
  });

  it("returns null when the move would not change order", () => {
    expect(reorderCueLists(lists("a", "b", "c"), "a", "b", "before")).toBeNull();
    expect(reorderCueLists(lists("a", "b", "c"), "b", "a", "after")).toBeNull();
  });

  it("returns null for unknown ids", () => {
    expect(reorderCueLists(lists("a", "b"), "x", "a", "before")).toBeNull();
    expect(reorderCueLists(lists("a", "b"), "a", "x", "before")).toBeNull();
  });

  it("does not mutate the input array", () => {
    const input = lists("a", "b", "c");
    reorderCueLists(input, "c", "a", "before");
    expect(input.map((l) => l.id)).toEqual(["a", "b", "c"]);
  });
});

describe("nextCueListName", () => {
  it("numbers sequence lists independently of hot lists", () => {
    const main = createCueList("Main");
    const hot = createCueList("Hot Cues", "hot");
    expect(nextCueListName([main, hot], "sequence")).toBe("List 2");
    expect(nextCueListName([main, hot], "hot")).toBe("Hot Cues 2");
  });
});

describe("uniqueCueListName", () => {
  it("keeps the name when unused", () => {
    expect(uniqueCueListName("Act 2", lists("Main"))).toBe("Act 2");
  });

  it("appends a copy suffix when the name is taken", () => {
    expect(uniqueCueListName("Main", lists("Main"))).toBe("Main copy");
  });

  it("numbers further copies", () => {
    const existing = [...lists("Main"), { ...createCueList("Main copy"), id: "x" }];
    expect(uniqueCueListName("Main", existing)).toBe("Main copy 2");
  });
});
