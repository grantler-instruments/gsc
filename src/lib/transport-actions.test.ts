import { beforeEach, describe, expect, it } from "vitest";
import { useFadeStore } from "../stores/fade";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { useUiStore } from "../stores/ui";
import { resetTestProject, testCue } from "../test/fixtures/cues";
import { createCueList } from "./cue-lists";
import { triggerGoAndAdvance, triggerGoSelected } from "./transport-actions";

function activeListSelection(): string[] {
  const { cueLists, activeCueListId } = useProjectStore.getState();
  return cueLists.find((l) => l.id === activeCueListId)?.selectedCueIds ?? [];
}

function resetTransport() {
  useTransportStore.setState({
    isPlaying: false,
    activeCueId: null,
    activeCueIds: [],
    cueStartedAtMs: {},
    runningSequence: null,
    masterVolume: 1,
  });
}

describe("triggerGoAndAdvance", () => {
  beforeEach(() => {
    resetTestProject([testCue("a", "A", "audio"), testCue("b", "B", "audio")]);
    resetTransport();
    useUiStore.setState({ collapsedCueGroupIds: [] });
    useFadeStore.setState({ fadesByTargetId: {}, dmxFadesByFadeCueId: {}, frameMs: 0 });
  });

  it("GOs the cue through transport and advances selection", () => {
    useProjectStore.getState().selectCue("a");
    const cue = useProjectStore.getState().cueLists[0].cues.find((c) => c.id === "a");
    if (!cue) throw new Error("Expected cue a");

    triggerGoAndAdvance(cue);

    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);
    expect(activeListSelection()).toEqual(["b"]);
  });

  it("skips container children when advancing after GO", () => {
    resetTestProject([
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio"),
    ]);
    const group = useProjectStore.getState().cueLists[0].cues.find((c) => c.id === "g");
    if (!group) throw new Error("Expected group cue");

    triggerGoAndAdvance(group);

    expect(useTransportStore.getState().activeCueIds).toContain("a");
    expect(activeListSelection()).toEqual(["b"]);
  });
});

describe("triggerGoSelected", () => {
  beforeEach(() => {
    resetTestProject([testCue("a", "A", "audio"), testCue("b", "B", "audio")]);
    resetTransport();
    useUiStore.setState({ collapsedCueGroupIds: [] });
    useFadeStore.setState({ fadesByTargetId: {}, dmxFadesByFadeCueId: {}, frameMs: 0 });
  });

  it("GOs the selected cue and advances selection", () => {
    useProjectStore.getState().selectCue("a");

    triggerGoSelected();

    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);
    expect(activeListSelection()).toEqual(["b"]);
  });

  it("GOs the first top-level cue when nothing is selected", () => {
    useProjectStore.getState().selectCue(null);

    triggerGoSelected();

    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);
    expect(activeListSelection()).toEqual(["b"]);
  });

  it("does nothing when the cue list is empty", () => {
    resetTestProject([]);

    triggerGoSelected();

    expect(useTransportStore.getState().activeCueIds).toEqual([]);
    expect(activeListSelection()).toEqual([]);
  });

  it("targets the first top-level cue, not a nested child, when nothing is selected", () => {
    resetTestProject([
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
    ]);
    useProjectStore.getState().selectCue(null);

    triggerGoSelected();

    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);
  });
});

describe("playback across many cue lists", () => {
  // There is no maximum number of cue lists, so playback must be able to run
  // through an arbitrary count of them, auto-advancing to each next tab.
  const LIST_COUNT = 12;

  beforeEach(() => {
    resetTransport();
    useUiStore.setState({ collapsedCueGroupIds: [] });
    useFadeStore.setState({ fadesByTargetId: {}, dmxFadesByFadeCueId: {}, frameMs: 0 });

    const lists = Array.from({ length: LIST_COUNT }, (_, i) => {
      const list = createCueList(`List ${i + 1}`);
      list.cues = [testCue(`cue-${i}`, `Cue ${i + 1}`, "audio")];
      return list;
    });
    useProjectStore.setState({ cueLists: lists, activeCueListId: lists[0].id });
  });

  it("plays GO through every cue list and auto-advances across all tabs", () => {
    const lists = useProjectStore.getState().cueLists;
    expect(lists).toHaveLength(LIST_COUNT);

    const triggered: string[] = [];

    for (let i = 0; i < LIST_COUNT; i++) {
      const { cueLists, activeCueListId } = useProjectStore.getState();
      expect(activeCueListId).toBe(cueLists[i].id);

      useProjectStore.getState().selectCue(`cue-${i}`);
      const cue = cueLists[i].cues.find((c) => c.id === `cue-${i}`);
      if (!cue) throw new Error(`Expected cue-${i}`);

      triggerGoAndAdvance(cue);
      triggered.push(`cue-${i}`);

      // Leaf audio GO accumulates the active set, so every triggered cue keeps
      // playing while the most recent one becomes the primary active cue.
      expect(useTransportStore.getState().activeCueId).toBe(`cue-${i}`);
      expect(useTransportStore.getState().activeCueIds).toEqual(triggered);

      if (i < LIST_COUNT - 1) {
        // After the last cue of a list, selection jumps to the next tab.
        expect(useProjectStore.getState().activeCueListId).toBe(cueLists[i + 1].id);
        expect(activeListSelection()).toEqual([`cue-${i + 1}`]);
      } else {
        // The final list has no next tab to advance to.
        expect(useProjectStore.getState().activeCueListId).toBe(cueLists[i].id);
        expect(activeListSelection()).toEqual([`cue-${i}`]);
      }
    }

    expect(triggered).toEqual(Array.from({ length: LIST_COUNT }, (_, i) => `cue-${i}`));
    // All cues from every list are still active after playing through them.
    expect(useTransportStore.getState().activeCueIds).toEqual(triggered);
  });
});
