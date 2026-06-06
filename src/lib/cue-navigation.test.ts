import { beforeEach, describe, expect, it } from "vitest";
import { createCueList } from "./cue-lists";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { useUiStore } from "../stores/ui";
import { activeCues, resetTestProject, testCue } from "../test/fixtures/cues";
import {
  deletePrimarySelectedCue,
  selectAdjacentVisibleCue,
  selectNextCueAfterGo,
} from "./cue-navigation";

function activeListSelection(): string[] {
  const { cueLists, activeCueListId } = useProjectStore.getState();
  return cueLists.find((l) => l.id === activeCueListId)?.selectedCueIds ?? [];
}

describe("selectAdjacentVisibleCue", () => {
  beforeEach(() => {
    resetTestProject([
      testCue("a", "A", "audio"),
      testCue("b", "B", "audio"),
      testCue("c", "C", "audio"),
    ]);
    useUiStore.setState({ collapsedCueGroupIds: [] });
  });

  it("moves selection forward and backward", () => {
    useProjectStore.getState().selectCue("a");

    selectAdjacentVisibleCue(1);
    expect(activeListSelection()).toEqual(["b"]);

    selectAdjacentVisibleCue(-1);
    expect(activeListSelection()).toEqual(["a"]);
  });

  it("respects collapsed groups when moving down", () => {
    resetTestProject([
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio"),
    ]);
    useUiStore.setState({ collapsedCueGroupIds: ["g"] });
    useProjectStore.getState().selectCue("g");

    selectAdjacentVisibleCue(1);
    expect(activeListSelection()).toEqual(["b"]);
  });
});

describe("selectNextCueAfterGo", () => {
  beforeEach(() => {
    useUiStore.setState({ collapsedCueGroupIds: [] });
  });

  it("skips visible children after GO on a container", () => {
    resetTestProject([
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio"),
    ]);
    useProjectStore.getState().selectCue("g");

    selectNextCueAfterGo("g");
    expect(activeListSelection()).toEqual(["b"]);
  });

  it("selects the next sibling for a leaf cue", () => {
    resetTestProject([testCue("a", "A", "audio"), testCue("b", "B", "audio")]);
    useProjectStore.getState().selectCue("a");

    selectNextCueAfterGo("a");
    expect(activeListSelection()).toEqual(["b"]);
  });

  it("switches to the next tab after the last cue in a list", () => {
    const list1 = createCueList("Act 1");
    list1.cues = [testCue("a", "A", "audio")];
    const list2 = createCueList("Act 2");
    list2.cues = [testCue("x", "X", "audio"), testCue("y", "Y", "audio")];
    useProjectStore.setState({
      cueLists: [list1, list2],
      activeCueListId: list1.id,
    });
    useProjectStore.getState().selectCue("a");

    selectNextCueAfterGo("a");

    expect(useProjectStore.getState().activeCueListId).toBe(list2.id);
    expect(activeListSelection()).toEqual(["x"]);
  });

  it("stays on the last cue when already on the final tab", () => {
    resetTestProject([testCue("a", "A", "audio")]);
    useProjectStore.getState().selectCue("a");

    selectNextCueAfterGo("a");

    expect(activeListSelection()).toEqual(["a"]);
  });
});

describe("deletePrimarySelectedCue", () => {
  beforeEach(() => {
    resetTestProject([
      testCue("a", "A", "audio"),
      testCue("b", "B", "audio"),
      testCue("c", "C", "audio"),
    ]);
    useUiStore.setState({ showMode: false, collapsedCueGroupIds: [] });
    useTransportStore.setState({
      isPlaying: false,
      activeCueId: null,
      activeCueIds: [],
      cueStartedAtMs: {},
      runningSequence: null,
      masterVolume: 1,
    });
  });

  it("deletes the primary selection and selects the next visible cue", () => {
    useProjectStore.getState().selectCue("b");

    deletePrimarySelectedCue();

    expect(activeCues().map((c) => c.id)).toEqual(["a", "c"]);
    expect(activeListSelection()).toEqual(["c"]);
  });

  it("does nothing in show mode", () => {
    useUiStore.setState({ showMode: true });
    useProjectStore.getState().selectCue("b");

    deletePrimarySelectedCue();

    expect(activeCues()).toHaveLength(3);
  });
});
