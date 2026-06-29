import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import { activeCues, resetTestProject, testCue } from "../../test/fixtures/cues";

function groupChildOrder(groupId: string): string[] {
  return activeCues()
    .filter((c) => c.parentId === groupId)
    .map((c) => c.id);
}

describe("cue editor container actions", () => {
  beforeEach(() => {
    useUiStore.setState({ showMode: false });
  });

  it("moveCueToGroup appends the cue after existing group children", () => {
    resetTestProject([
      testCue("x", "X", "audio"),
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio", { parentId: "g" }),
    ]);

    useProjectStore.getState().moveCueToGroup("x", "g");

    expect(groupChildOrder("g")).toEqual(["a", "b", "x"]);
  });

  it("reparentCueRelative reorders within a group", () => {
    resetTestProject([
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio", { parentId: "g" }),
      testCue("c", "C", "audio", { parentId: "g" }),
    ]);

    useProjectStore.getState().reparentCueRelative("c", "a", "before");

    expect(groupChildOrder("g")).toEqual(["c", "a", "b"]);
  });

  it("reparentCueRelative inserts a top-level cue into the middle of a group", () => {
    resetTestProject([
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio", { parentId: "g" }),
      testCue("x", "X", "audio"),
    ]);

    useProjectStore.getState().reparentCueRelative("x", "b", "before");

    expect(activeCues().find((c) => c.id === "x")?.parentId).toBe("g");
    expect(groupChildOrder("g")).toEqual(["a", "x", "b"]);
  });

  it("reparentCueToListEnd moves a nested cue to the end of the top-level list", () => {
    resetTestProject([
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("c", "C", "audio"),
    ]);

    useProjectStore.getState().reparentCueToListEnd("a");

    expect(activeCues().find((c) => c.id === "a")?.parentId).toBeUndefined();
    expect(
      activeCues()
        .filter((c) => !c.parentId)
        .map((c) => c.id),
    ).toEqual(["g", "c", "a"]);
  });

  it("moveCueToGroup with null removes a cue from its container", () => {
    resetTestProject([
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio", { parentId: "g" }),
    ]);

    useProjectStore.getState().moveCueToGroup("a", null);

    expect(activeCues().find((c) => c.id === "a")?.parentId).toBeUndefined();
    expect(groupChildOrder("g")).toEqual(["b"]);
  });
});
