import { beforeEach, describe, expect, it } from "vitest";
import { createCueList } from "../lib/cue-lists";
import { useFadeStore } from "../stores/fade";
import { getMainSequenceListFromState, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { useUiStore } from "../stores/ui";
import { resetTestProject, testCue } from "../test/fixtures/cues";
import { triggerGoAndAdvance, triggerGoSelected, triggerHotCue } from "./transport-actions";

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
    runningSequences: {},
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

describe("triggerHotCue", () => {
  beforeEach(() => {
    resetTransport();
    useUiStore.setState({ collapsedCueGroupIds: [] });
    useFadeStore.setState({ fadesByTargetId: {}, dmxFadesByFadeCueId: {}, frameMs: 0 });
  });

  it("fires a hot cue without moving the main list selection", () => {
    resetTestProject([testCue("a", "A", "audio"), testCue("b", "B", "audio")]);
    const main = useProjectStore.getState().cueLists[0];
    const hot = createCueList("Hot", "hot");
    hot.cues = [testCue("h1", "Sting", "audio")];
    useProjectStore.setState({ cueLists: [main, hot], activeCueListId: main.id });
    useProjectStore.getState().selectCue("a");

    triggerHotCue(hot.cues[0]);

    expect(useTransportStore.getState().activeCueIds).toEqual(["h1"]);
    expect(activeListSelection()).toEqual(["a"]);
  });

  it("stacks a hot cue on top of already-playing main cues", () => {
    resetTestProject([testCue("a", "A", "audio")]);
    const main = useProjectStore.getState().cueLists[0];
    const hot = createCueList("Hot", "hot");
    hot.cues = [testCue("h1", "Sting", "audio")];
    useProjectStore.setState({ cueLists: [main, hot], activeCueListId: main.id });

    useTransportStore.getState().go("a");
    triggerHotCue(hot.cues[0]);

    expect(useTransportStore.getState().activeCueIds).toEqual(["a", "h1"]);
  });

  it("runs a hot sequence without cancelling the running main sequence", () => {
    resetTestProject([
      testCue("mseq", "Main Seq", "sequence"),
      testCue("m1", "M1", "audio", { parentId: "mseq" }),
      testCue("m2", "M2", "audio", { parentId: "mseq" }),
    ]);
    const mainList = useProjectStore.getState().cueLists[0];
    const hot = createCueList("Hot", "hot");
    hot.cues = [
      testCue("hseq", "Hot Seq", "sequence"),
      testCue("h1", "H1", "audio", { parentId: "hseq" }),
      testCue("h2", "H2", "audio", { parentId: "hseq" }),
    ];
    useProjectStore.setState({ cueLists: [mainList, hot], activeCueListId: mainList.id });

    const mainSeq = mainList.cues[0];
    triggerGoAndAdvance(mainSeq);
    triggerHotCue(hot.cues[0]);

    const running = useTransportStore.getState().runningSequences;
    expect(running.mseq).toMatchObject({ rootId: "mseq", scope: "main" });
    expect(running.hseq).toMatchObject({ rootId: "hseq", scope: "overlay" });
  });
});

describe("triggerGoSelected", () => {
  beforeEach(() => {
    resetTestProject([testCue("a", "A", "audio"), testCue("b", "B", "audio")]);
    resetTransport();
    useUiStore.setState({ collapsedCueGroupIds: [], showMode: false });
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

  it.each([false, true])(
    "GOs focused hot cue and returns focus to the main list (showMode=%s)",
    (showMode) => {
      resetTestProject([testCue("a", "A", "audio"), testCue("b", "B", "audio")]);
      const main = useProjectStore.getState().cueLists[0];
      const hot = createCueList("Hot", "hot");
      hot.cues = [testCue("h1", "Sting", "audio")];
      useProjectStore.setState({
        cueLists: [main, hot],
        activeCueListId: hot.id,
        mainSequenceListId: main.id,
        activeHotCueListId: hot.id,
      });
      useUiStore.setState({ showMode });
      useProjectStore.getState().selectCue("h1");
      useProjectStore.getState().selectCueInList(main.id, "a");

      triggerGoSelected();

      expect(useTransportStore.getState().activeCueIds).toEqual(["h1"]);
      expect(useProjectStore.getState().activeCueListId).toBe(main.id);
      expect(activeListSelection()).toEqual(["a"]);
      expect(getMainSequenceListFromState(useProjectStore.getState())?.selectedCueIds).toEqual([
        "a",
      ]);
    },
  );

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
