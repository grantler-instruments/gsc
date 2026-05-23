import { beforeEach, describe, expect, it } from "vitest";
import { useFadeStore } from "../stores/fade";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { useUiStore } from "../stores/ui";
import { resetTestProject, testCue } from "../test/fixtures/cues";
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

    triggerGoAndAdvance(useProjectStore.getState().cueLists[0].cues.find((c) => c.id === "a")!);

    expect(useTransportStore.getState().activeCueIds).toEqual(["a"]);
    expect(activeListSelection()).toEqual(["b"]);
  });

  it("skips container children when advancing after GO", () => {
    resetTestProject([
      testCue("g", "Group", "group"),
      testCue("a", "A", "audio", { parentId: "g" }),
      testCue("b", "B", "audio"),
    ]);
    const group = useProjectStore.getState().cueLists[0].cues.find((c) => c.id === "g")!;

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
