import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import { useVfsStore } from "../stores/vfs";
import { activeCues, resetTestProject, testCue } from "../test/fixtures/cues";
import {
  canRedoProjectEdit,
  canUndoProjectEdit,
  redoProjectEdit,
  resetProjectHistoryForTests,
  subscribeProjectHistory,
  undoProjectEdit,
} from "./project-history";

describe("project history", () => {
  let unsubscribe = () => {};

  beforeEach(() => {
    resetProjectHistoryForTests();
    resetTestProject([testCue("a", "A", "audio"), testCue("b", "B", "audio")]);
    useUiStore.setState({ showMode: false });
    useVfsStore.setState({ entries: [{ path: "assets/clip.wav", name: "clip.wav", size: 1, mimeType: "audio/wav", kind: "audio", loaded: true }] });
    unsubscribe = subscribeProjectHistory();
  });

  afterEach(() => {
    unsubscribe();
  });

  it("undoes and redoes cue edits without touching vfs", () => {
    useProjectStore.getState().updateCue("a", { name: "Renamed" });
    expect(activeCues().find((c) => c.id === "a")?.name).toBe("Renamed");
    expect(useVfsStore.getState().entries).toHaveLength(1);

    expect(undoProjectEdit()).toBe(true);
    expect(activeCues().find((c) => c.id === "a")?.name).toBe("A");
    expect(useVfsStore.getState().entries).toHaveLength(1);

    expect(redoProjectEdit()).toBe(true);
    expect(activeCues().find((c) => c.id === "a")?.name).toBe("Renamed");
    expect(useVfsStore.getState().entries).toHaveLength(1);
  });

  it("undoes cue removal", () => {
    useProjectStore.getState().selectCue("b");
    useProjectStore.getState().removeCue("b");
    expect(activeCues()).toHaveLength(1);

    expect(undoProjectEdit()).toBe(true);
    expect(activeCues()).toHaveLength(2);
    expect(useProjectStore.getState().cueLists[0]?.selectedCueIds).toEqual(["b"]);
  });

  it("does not record runtime volume patches in show mode", () => {
    useUiStore.setState({ showMode: true });
    useProjectStore.getState().updateCue("a", { volume: 0.5 });
    expect(canUndoProjectEdit()).toBe(false);
  });

  it("does not undo in show mode", () => {
    useProjectStore.getState().updateCue("a", { name: "Renamed" });
    useUiStore.setState({ showMode: true });
    expect(undoProjectEdit()).toBe(false);
    expect(activeCues().find((c) => c.id === "a")?.name).toBe("Renamed");
  });

  it("reports undo/redo availability", () => {
    expect(canUndoProjectEdit()).toBe(false);
    expect(canRedoProjectEdit()).toBe(false);

    useProjectStore.getState().updateCue("a", { name: "Renamed" });
    expect(canUndoProjectEdit()).toBe(true);
    expect(canRedoProjectEdit()).toBe(false);

    undoProjectEdit();
    expect(canUndoProjectEdit()).toBe(false);
    expect(canRedoProjectEdit()).toBe(true);
  });
});
