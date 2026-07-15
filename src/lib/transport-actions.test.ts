import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCueList } from "../lib/cue-lists";
import { useFadeStore } from "../stores/fade";
import { getMainSequenceListFromState, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { useUiStore } from "../stores/ui";
import { resetTestProject, testCue } from "../test/fixtures/cues";
import {
  focusMainCueList,
  triggerGoAndAdvance,
  triggerGoSelected,
  triggerHotCue,
  triggerHotCueAndFocusMain,
} from "./transport-actions";
import { triggerStopCue } from "./trigger";

vi.mock("../platform/send-dmx", () => ({
  sendDmxUniverses: vi.fn(),
}));

import { sendDmxUniverses } from "../platform/send-dmx";

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
    vi.mocked(sendDmxUniverses).mockClear();
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

  it("stacks multiple hot cues on top of already-playing main cues", () => {
    resetTestProject([testCue("a", "A", "audio")]);
    const main = useProjectStore.getState().cueLists[0];
    const hot = createCueList("Hot", "hot");
    hot.cues = [testCue("h1", "Sting A", "audio"), testCue("h2", "Sting B", "audio")];
    useProjectStore.setState({ cueLists: [main, hot], activeCueListId: main.id });

    useTransportStore.getState().go("a");
    triggerHotCue(hot.cues[0]);
    triggerHotCue(hot.cues[1]);

    expect(useTransportStore.getState().activeCueIds).toEqual(["a", "h1", "h2"]);
  });

  it("stopping the main cue leaves hot cues playing", () => {
    resetTestProject([testCue("a", "A", "audio")]);
    const main = useProjectStore.getState().cueLists[0];
    const hot = createCueList("Hot", "hot");
    hot.cues = [testCue("h1", "Sting", "audio")];
    useProjectStore.setState({ cueLists: [main, hot], activeCueListId: main.id });

    useTransportStore.getState().go("a");
    triggerHotCue(hot.cues[0]);

    const mainCue = main.cues.find((c) => c.id === "a");
    if (!mainCue) throw new Error("Expected main cue a");
    triggerStopCue(mainCue, main.cues, useTransportStore.getState().stopMany);

    expect(useTransportStore.getState().activeCueIds).toEqual(["h1"]);
    expect(useTransportStore.getState().isPlaying).toBe(true);
  });

  it("stopping a hot cue leaves main cues playing", () => {
    resetTestProject([testCue("a", "A", "audio")]);
    const main = useProjectStore.getState().cueLists[0];
    const hot = createCueList("Hot", "hot");
    hot.cues = [testCue("h1", "Sting", "audio")];
    useProjectStore.setState({ cueLists: [main, hot], activeCueListId: main.id });

    useTransportStore.getState().go("a");
    triggerHotCue(hot.cues[0]);

    const hotCue = hot.cues[0];
    const allCues = [...main.cues, ...hot.cues];
    triggerStopCue(hotCue, allCues, useTransportStore.getState().stopMany);

    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);
    expect(useTransportStore.getState().isPlaying).toBe(true);
  });

  it("re-triggering the same hot cue restarts its playback timestamp", () => {
    resetTestProject([testCue("a", "A", "audio")]);
    const main = useProjectStore.getState().cueLists[0];
    const hot = createCueList("Hot", "hot");
    hot.cues = [testCue("h1", "Sting", "audio")];
    useProjectStore.setState({ cueLists: [main, hot], activeCueListId: main.id });

    const now = vi.spyOn(Date, "now");
    now.mockReturnValueOnce(1_000).mockReturnValueOnce(2_000).mockReturnValueOnce(3_000);

    useTransportStore.getState().go("a");
    triggerHotCue(hot.cues[0]);
    const firstStartedAt = useTransportStore.getState().cueStartedAtMs.h1;

    triggerHotCue(hot.cues[0]);
    const secondStartedAt = useTransportStore.getState().cueStartedAtMs.h1;

    expect(firstStartedAt).toBe(2_000);
    expect(secondStartedAt).toBe(3_000);
    expect(useTransportStore.getState().activeCueIds).toEqual(["a", "h1"]);
    now.mockRestore();
  });

  it("hot stop cue stops a playing main cue without stopping overlay hot audio", () => {
    resetTestProject([testCue("a", "A", "audio")]);
    const main = useProjectStore.getState().cueLists[0];
    const hot = createCueList("Hot", "hot");
    hot.cues = [
      testCue("h1", "Sting", "audio"),
      testCue("stop", "Stop Main", "stop", { stopTargetId: "a" }),
    ];
    useProjectStore.setState({ cueLists: [main, hot], activeCueListId: main.id });

    useTransportStore.getState().go("a");
    triggerHotCue(hot.cues[0]);
    triggerHotCue(hot.cues[1]);

    expect(useTransportStore.getState().activeCueIds).toEqual(["h1"]);
    expect(useTransportStore.getState().isPlaying).toBe(true);
  });

  it("hot stop cue stops another hot cue without stopping main audio", () => {
    resetTestProject([testCue("a", "A", "audio")]);
    const main = useProjectStore.getState().cueLists[0];
    const hot = createCueList("Hot", "hot");
    hot.cues = [
      testCue("h1", "Sting A", "audio"),
      testCue("h2", "Sting B", "audio"),
      testCue("stop", "Stop H1", "stop", { stopTargetId: "h1" }),
    ];
    useProjectStore.setState({ cueLists: [main, hot], activeCueListId: main.id });

    useTransportStore.getState().go("a");
    triggerHotCue(hot.cues[0]);
    triggerHotCue(hot.cues[1]);
    triggerHotCue(hot.cues[2]);

    expect(useTransportStore.getState().activeCueIds).toEqual(["a", "h2"]);
    expect(useTransportStore.getState().isPlaying).toBe(true);
  });

  it("stopping a hot sequence leaves main cues playing", () => {
    resetTestProject([testCue("a", "A", "audio")]);
    const main = useProjectStore.getState().cueLists[0];
    const hot = createCueList("Hot", "hot");
    hot.cues = [
      testCue("hseq", "Hot Seq", "sequence"),
      testCue("h1", "H1", "audio", { parentId: "hseq" }),
      testCue("h2", "H2", "audio", { parentId: "hseq" }),
    ];
    useProjectStore.setState({ cueLists: [main, hot], activeCueListId: main.id });

    useTransportStore.getState().go("a");
    triggerHotCue(hot.cues[0]);

    const hseq = hot.cues.find((c) => c.id === "hseq");
    if (!hseq) throw new Error("Expected hot sequence");
    const allCues = [...main.cues, ...hot.cues];
    triggerStopCue(hseq, allCues, useTransportStore.getState().stopMany);

    expect(useTransportStore.getState().runningSequences.hseq).toBeUndefined();
    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);
    expect(useTransportStore.getState().isPlaying).toBe(true);
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

  it("stacks hot cues from separate hot lists on main playback", () => {
    resetTestProject([testCue("a", "A", "audio")]);
    const main = useProjectStore.getState().cueLists[0];
    const hotA = createCueList("Hot A", "hot");
    hotA.cues = [testCue("h1", "Sting A", "audio")];
    const hotB = createCueList("Hot B", "hot");
    hotB.cues = [testCue("h2", "Sting B", "audio")];
    useProjectStore.setState({
      cueLists: [main, hotA, hotB],
      activeCueListId: main.id,
      activeHotCueListId: hotA.id,
    });

    useTransportStore.getState().go("a");
    triggerHotCue(hotA.cues[0]);
    triggerHotCue(hotB.cues[0]);

    expect(useTransportStore.getState().activeCueIds).toEqual(["a", "h1", "h2"]);
    expect(useTransportStore.getState().isPlaying).toBe(true);
  });

  it("hot video cue stacks as overlay without stopping main audio", () => {
    resetTestProject([testCue("a", "A", "audio")]);
    const main = useProjectStore.getState().cueLists[0];
    const hot = createCueList("Hot", "hot");
    hot.cues = [testCue("hv", "Clip", "video", { assetPath: "/assets/clip.mp4" })];
    useProjectStore.setState({ cueLists: [main, hot], activeCueListId: main.id });

    useTransportStore.getState().go("a");
    triggerHotCue(hot.cues[0]);

    expect(useTransportStore.getState().activeCueIds).toEqual(["a", "hv"]);
    expect(useTransportStore.getState().isPlaying).toBe(true);
  });

  it("hot volume fade starts on a hot target while main keeps playing", () => {
    resetTestProject([testCue("a", "A", "audio")]);
    const main = useProjectStore.getState().cueLists[0];
    const hot = createCueList("Hot", "hot");
    hot.cues = [
      testCue("h1", "Sting", "audio", { volume: 1 }),
      testCue("fade", "Fade out", "volumeFade", {
        fadeTargetId: "h1",
        fadeDuration: 2,
        fadeTo: 0,
      }),
    ];
    useProjectStore.setState({ cueLists: [main, hot], activeCueListId: main.id });

    useTransportStore.getState().go("a");
    triggerHotCue(hot.cues[0]);
    triggerHotCue(hot.cues[1]);

    expect(useTransportStore.getState().activeCueIds).toEqual(["a", "h1"]);
    expect(useFadeStore.getState().fadesByTargetId.h1).toMatchObject({
      targetId: "h1",
      property: "volume",
      to: 0,
      durationSec: 2,
    });
  });

  it("hot dmx cue fires without joining the active cue list", () => {
    resetTestProject([testCue("a", "A", "audio")]);
    const main = useProjectStore.getState().cueLists[0];
    const hot = createCueList("Hot", "hot");
    hot.cues = [
      testCue("hd", "Look", "dmx", {
        dmx: { mode: "snapshot", fixtures: [] },
      }),
    ];
    useProjectStore.setState({ cueLists: [main, hot], activeCueListId: main.id });

    useTransportStore.getState().go("a");
    triggerHotCue(hot.cues[0]);

    expect(sendDmxUniverses).toHaveBeenCalledOnce();
    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);
    expect(useTransportStore.getState().isPlaying).toBe(true);
  });
});

describe("triggerHotCueAndFocusMain", () => {
  beforeEach(() => {
    resetTransport();
    useUiStore.setState({ collapsedCueGroupIds: [] });
    useFadeStore.setState({ fadesByTargetId: {}, dmxFadesByFadeCueId: {}, frameMs: 0 });
  });

  it("fires the hot cue and restores focus back to the main list", () => {
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

    useProjectStore.getState().selectCueInList(main.id, "b");
    useProjectStore.getState().selectCue("h1");

    triggerHotCueAndFocusMain(hot.cues[0]);

    expect(useTransportStore.getState().activeCueIds).toEqual(["h1"]);
    expect(useProjectStore.getState().activeCueListId).toBe(main.id);
    expect(getMainSequenceListFromState(useProjectStore.getState())?.selectedCueIds).toEqual(["b"]);
  });
});

describe("focusMainCueList", () => {
  it("does nothing when there is no main list", () => {
    useProjectStore.setState({ cueLists: [] });
    expect(() => focusMainCueList()).not.toThrow();
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

  it("GOs focused hot cue while main is already playing", () => {
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

    useTransportStore.getState().go("a");
    useProjectStore.getState().selectCue("h1");
    useProjectStore.getState().selectCueInList(main.id, "b");

    triggerGoSelected();

    expect(useTransportStore.getState().activeCueIds).toEqual(["a", "h1"]);
    expect(useProjectStore.getState().activeCueListId).toBe(main.id);
    expect(getMainSequenceListFromState(useProjectStore.getState())?.selectedCueIds).toEqual(["b"]);
  });

  it.each([
    false,
    true,
  ])("GOs focused hot cue and returns focus to the main list (showMode=%s)", (showMode) => {
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
    expect(getMainSequenceListFromState(useProjectStore.getState())?.selectedCueIds).toEqual(["a"]);
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
