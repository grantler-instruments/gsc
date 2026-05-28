import { describe, expect, it } from "vitest";
import { getDmxChannelLevel } from "./dmx";
import { buildDmxPreviewFrames } from "./dmx-preview";
import { usePlaybackStore } from "../stores/playback";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { useUiStore } from "../stores/ui";
import { resetTestProject, testCue } from "../test/fixtures/cues";
import type { Fixture } from "../types/fixture";
import {
  applyRemoteSnapshot,
  buildRemoteSnapshot,
} from "./remote-snapshot";

describe("remote-snapshot", () => {
  it("round-trips project, selection, and transport state", () => {
    resetTestProject();
    const cue = testCue("c1", "Intro", "audio", { number: "1" });
    useProjectStore.setState({
      cueLists: [
        {
          id: "list1",
          name: "Main",
          cues: [cue],
          selectedCueIds: [cue.id],
          selectionAnchorId: cue.id,
        },
      ],
      activeCueListId: "list1",
    });
    useTransportStore.getState().go(cue.id);
    usePlaybackStore.getState().setProgress([]);

    const snapshot = buildRemoteSnapshot();
    resetTestProject();
    applyRemoteSnapshot(snapshot);

    const list = useProjectStore.getState().cueLists[0];
    expect(list.cues[0]?.name).toBe("Intro");
    expect(list.selectedCueIds).toEqual([cue.id]);
    expect(useTransportStore.getState().activeCueIds).toContain(cue.id);
  });

  it("applies selection from snapshot", () => {
    resetTestProject();
    const cueA = testCue("a", "A", "audio", { number: "1" });
    const cueB = testCue("b", "B", "audio", { number: "2" });
    useProjectStore.setState({
      cueLists: [
        {
          id: "list1",
          name: "Main",
          cues: [cueA, cueB],
          selectedCueIds: [],
          selectionAnchorId: null,
        },
      ],
      activeCueListId: "list1",
    });

    useProjectStore.setState((s) => ({
      ...s,
      cueLists: s.cueLists.map((list) =>
        list.id === "list1"
          ? { ...list, selectedCueIds: [cueB.id], selectionAnchorId: cueB.id }
          : list,
      ),
    }));

    const snapshot = buildRemoteSnapshot();
    resetTestProject();
    applyRemoteSnapshot(snapshot);

    const list = useProjectStore.getState().cueLists.find((l) => l.id === "list1");
    expect(list?.selectedCueIds).toEqual([cueB.id]);
    expect(list?.selectionAnchorId).toBe(cueB.id);
  });

  it("syncs DMX preview toggles, plot layout, and fixture levels", () => {
    resetTestProject();
    const fixture: Fixture = {
      id: "fx1",
      name: "Par 1",
      universe: 1,
      startAddress: 1,
      channelCount: 2,
      channels: [],
    };
    const cue = testCue("c1", "Look", "dmx", {
      dmx: {
        mode: "snapshot",
        fixtures: [{ fixtureId: "fx1", values: [128, 64] }],
      },
    });
    useProjectStore.setState({
      fixtures: [fixture],
      cueLists: [
        {
          id: "list1",
          name: "Main",
          cues: [cue],
          selectedCueIds: [],
          selectionAnchorId: null,
        },
      ],
      activeCueListId: "list1",
    });
    useUiStore.setState({ dmxPreviewCueIds: [cue.id], fixturePlotExpanded: true });
    const list = useProjectStore.getState().cueLists[0]!;
    buildDmxPreviewFrames(list.cues, [cue.id], [fixture]);

    const snapshot = buildRemoteSnapshot();
    resetTestProject();
    applyRemoteSnapshot(snapshot);

    expect(useUiStore.getState().dmxPreviewCueIds).toEqual([cue.id]);
    expect(useUiStore.getState().fixturePlotExpanded).toBe(true);
    expect(getDmxChannelLevel(1, 1)).toBe(128);
    expect(getDmxChannelLevel(1, 2)).toBe(64);
  });
});
