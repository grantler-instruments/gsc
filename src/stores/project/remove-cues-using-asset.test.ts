import { beforeEach, describe, expect, it } from "vitest";
import { createCueList } from "../../lib/cue-lists";
import { testCue } from "../../test/fixtures/cues";
import type { Cue } from "../../types/cue";
import { useProjectStore } from "../project";
import { useUiStore } from "../ui";

function setLists(lists: { id: string; name: string; cues: Cue[] }[]): void {
  useUiStore.setState({ showMode: false });
  useProjectStore.setState({
    cueLists: lists.map((l) => ({ ...createCueList(l.name), id: l.id, cues: l.cues })),
    activeCueListId: lists[0].id,
  });
}

function cueIdsByList(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const list of useProjectStore.getState().cueLists) {
    result[list.id] = list.cues.map((c) => c.id);
  }
  return result;
}

describe("removeCuesUsingAsset", () => {
  beforeEach(() => {
    useUiStore.setState({ showMode: false });
  });

  it("removes matching cues across every list and keeps the rest", () => {
    setLists([
      {
        id: "l1",
        name: "Main",
        cues: [
          testCue("a", "Intro", "audio", { assetPath: "/assets/intro.wav" }),
          testCue("b", "Keep", "audio", { assetPath: "/assets/other.wav" }),
        ],
      },
      {
        id: "l2",
        name: "Backup",
        cues: [
          testCue("c", "Reprise", "audio", { assetPath: "assets/intro.wav" }),
          testCue("d", "Cue", "midi"),
        ],
      },
    ]);

    useProjectStore.getState().removeCuesUsingAsset("/assets/intro.wav");

    expect(cueIdsByList()).toEqual({ l1: ["b"], l2: ["d"] });
  });

  it("also removes stop and fade cues that target a removed media cue", () => {
    setLists([
      {
        id: "l1",
        name: "Main",
        cues: [
          testCue("a", "Intro", "audio", { assetPath: "/assets/intro.wav" }),
          testCue("s", "Stop", "stop", { stopTargetId: "a" }),
          testCue("f", "Fade", "volumeFade", { fadeTargetId: "a" }),
          testCue("z", "Untouched", "audio", { assetPath: "/assets/other.wav" }),
        ],
      },
    ]);

    useProjectStore.getState().removeCuesUsingAsset("/assets/intro.wav");

    expect(cueIdsByList()).toEqual({ l1: ["z"] });
  });

  it("clears selection and anchor that referenced removed cues", () => {
    setLists([
      {
        id: "l1",
        name: "Main",
        cues: [testCue("a", "Intro", "audio", { assetPath: "/assets/intro.wav" })],
      },
    ]);
    useProjectStore.setState((s) => ({
      cueLists: s.cueLists.map((l) =>
        l.id === "l1" ? { ...l, selectedCueIds: ["a"], selectionAnchorId: "a" } : l,
      ),
    }));

    useProjectStore.getState().removeCuesUsingAsset("/assets/intro.wav");

    const list = useProjectStore.getState().cueLists[0];
    expect(list.cues).toEqual([]);
    expect(list.selectedCueIds).toEqual([]);
    expect(list.selectionAnchorId).toBeNull();
  });

  it("does nothing in show mode", () => {
    setLists([
      {
        id: "l1",
        name: "Main",
        cues: [testCue("a", "Intro", "audio", { assetPath: "/assets/intro.wav" })],
      },
    ]);
    useUiStore.setState({ showMode: true });

    useProjectStore.getState().removeCuesUsingAsset("/assets/intro.wav");

    expect(cueIdsByList()).toEqual({ l1: ["a"] });
    useUiStore.setState({ showMode: false });
  });
});

describe("removeCue cascade (expandCueRemovalSet)", () => {
  beforeEach(() => {
    useUiStore.setState({ showMode: false });
  });

  it("removes a stop cue that targets a child of a deleted container", () => {
    setLists([
      {
        id: "l1",
        name: "Main",
        cues: [
          testCue("g", "Group", "group"),
          testCue("c", "Child", "audio", { parentId: "g", assetPath: "/assets/intro.wav" }),
          testCue("s", "Stop child", "stop", { stopTargetId: "c" }),
          testCue("k", "Keep", "audio"),
        ],
      },
    ]);

    useProjectStore.getState().removeCue("g");

    expect(cueIdsByList()).toEqual({ l1: ["k"] });
  });
});
