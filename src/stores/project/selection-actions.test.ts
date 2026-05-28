import { beforeEach, describe, expect, it, vi } from "vitest";
import { setCueClipboard } from "../../lib/cue-clipboard";
import { useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import { activeCues, resetTestProject, testCue } from "../../test/fixtures/cues";

function activeListSelection(): string[] {
  const { cueLists, activeCueListId } = useProjectStore.getState();
  return cueLists.find((l) => l.id === activeCueListId)?.selectedCueIds ?? [];
}

describe("selection actions", () => {
  beforeEach(() => {
    resetTestProject([
      testCue("a", "A", "audio"),
      testCue("b", "B", "audio"),
      testCue("c", "C", "audio"),
    ]);
    useUiStore.setState({ showMode: false });
    setCueClipboard([]);
  });

  it("selectCue replaces the selection", () => {
    useProjectStore.getState().selectCue("b");
    expect(activeListSelection()).toEqual(["b"]);
  });

  it("toggleSelectCue adds and removes cues", () => {
    useProjectStore.getState().selectCue("a");
    useProjectStore.getState().toggleSelectCue("b");
    expect(activeListSelection()).toEqual(["a", "b"]);

    useProjectStore.getState().toggleSelectCue("a");
    expect(activeListSelection()).toEqual(["b"]);
  });

  it("selectCueRange selects a visible span from the anchor", () => {
    useProjectStore.getState().selectCue("a");
    useProjectStore.getState().selectCueRange("c", ["a", "b", "c"]);
    expect(activeListSelection()).toEqual(["a", "b", "c"]);
  });

  it("selectCueRange falls back to a single cue when anchor is missing", () => {
    useProjectStore.getState().selectCueRange("b", ["a", "b", "c"]);
    expect(activeListSelection()).toEqual(["b"]);
  });

  it("groups selected sibling cues", () => {
    let n = 0;
    vi.stubGlobal("crypto", { randomUUID: () => `uuid-${++n}` });

    useProjectStore.getState().selectCue("a");
    useProjectStore.getState().toggleSelectCue("b");
    const group = useProjectStore.getState().groupSelectedCues();

    expect(group?.type).toBe("group");
    expect(activeListSelection()).toEqual([group?.id]);
    expect(activeCues().filter((c) => c.parentId === group?.id)).toHaveLength(2);
  });

  it("cut and paste selected cues", () => {
    let n = 0;
    vi.stubGlobal("crypto", { randomUUID: () => `cut-${++n}` });

    resetTestProject([
      testCue("a", "A", "audio"),
      testCue("b", "B", "audio"),
      testCue("c", "C", "audio"),
    ]);
    useProjectStore.getState().selectCue("b");
    expect(useProjectStore.getState().cutSelectedCues()).toBe(true);
    expect(activeCues()).toHaveLength(2);
    expect(activeCues().some((c) => c.name === "B")).toBe(false);
    expect(activeListSelection()).toEqual(["c"]);

    useProjectStore.getState().selectCue("a");
    expect(useProjectStore.getState().pasteSelectedCues()).toBe(true);
    expect(activeCues()).toHaveLength(3);
    expect(activeCues().filter((c) => c.name === "B")).toHaveLength(1);
  });

  it("copy and paste selected cues", () => {
    let n = 0;
    vi.stubGlobal("crypto", { randomUUID: () => `paste-${++n}` });

    resetTestProject([testCue("a", "A", "audio")]);
    useProjectStore.getState().selectCue("a");
    expect(useProjectStore.getState().copySelectedCues()).toBe(true);
    expect(useProjectStore.getState().pasteSelectedCues()).toBe(true);
    expect(activeCues()).toHaveLength(2);
    expect(activeCues().filter((c) => c.name === "A")).toHaveLength(2);
  });

  it("blocks edits in show mode", () => {
    useUiStore.setState({ showMode: true });
    useProjectStore.getState().selectCue("a");
    useProjectStore.getState().toggleSelectCue("b");

    expect(useProjectStore.getState().groupSelectedCues()).toBeNull();
    expect(useProjectStore.getState().copySelectedCues()).toBe(false);
    expect(useProjectStore.getState().cutSelectedCues()).toBe(false);
    expect(useProjectStore.getState().pasteSelectedCues()).toBe(false);
    expect(useProjectStore.getState().duplicateSelectedCues()).toBe(false);
  });
});
