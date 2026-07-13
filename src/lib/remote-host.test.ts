import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCueList } from "../lib/cue-lists";
import { getMainSequenceListFromState, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { resetTestProject, testCue } from "../test/fixtures/cues";

const remoteBroadcast = vi.fn<(message: string) => Promise<void>>(async () => {});

vi.mock("../platform/remote-server", () => ({
  remoteBroadcast: (message: string) => remoteBroadcast(message),
}));

describe("broadcastRemoteSnapshot", () => {
  beforeEach(() => {
    remoteBroadcast.mockClear();
    resetTestProject();
  });

  it("broadcasts when the project has cues", async () => {
    const cue = testCue("c1", "Intro", "audio");
    useProjectStore.setState({
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

    const { broadcastRemoteSnapshot } = await import("./remote-host");
    await broadcastRemoteSnapshot();

    expect(remoteBroadcast).toHaveBeenCalledTimes(1);
    const message = String(remoteBroadcast.mock.calls[0]?.[0]);
    expect(message).toContain('"type":"snapshot"');
    expect(message).toContain("Intro");
  });

  it("does not broadcast when the project has no cues", async () => {
    const { broadcastRemoteSnapshot } = await import("./remote-host");
    await broadcastRemoteSnapshot();
    expect(remoteBroadcast).not.toHaveBeenCalled();
  });
});

describe("handleRemoteHostCommand", () => {
  beforeEach(() => {
    remoteBroadcast.mockClear();
    resetTestProject([testCue("a", "A", "audio")]);
    useTransportStore.setState({
      isPlaying: false,
      activeCueId: null,
      activeCueIds: [],
      cueStartedAtMs: {},
      runningSequences: {},
      masterVolume: 1,
    });
  });

  it("hot-go fires a hot cue as an overlay without changing main selection", async () => {
    const main = useProjectStore.getState().cueLists[0];
    const hot = createCueList("Hot", "hot");
    hot.cues = [testCue("h1", "Sting", "audio")];
    useProjectStore.setState({
      cueLists: [main, hot],
      activeCueListId: main.id,
      mainSequenceListId: main.id,
      activeHotCueListId: hot.id,
    });
    useProjectStore.getState().selectCue("a");

    useTransportStore.getState().go("a");

    const { handleRemoteHostCommand } = await import("./remote-host");
    handleRemoteHostCommand({ action: "hot-go", cue_id: "h1" });

    expect(useTransportStore.getState().activeCueIds).toEqual(["a", "h1"]);
    expect(useProjectStore.getState().activeCueListId).toBe(main.id);
    expect(
      useProjectStore.getState().cueLists.find((l) => l.id === main.id)?.selectedCueIds,
    ).toEqual(["a"]);
    expect(remoteBroadcast).toHaveBeenCalledTimes(1);
  });

  it("go on the active hot list fires overlay without advancing main selection", async () => {
    const main = useProjectStore.getState().cueLists[0];
    const hot = createCueList("Hot", "hot");
    hot.cues = [testCue("h1", "Sting", "audio")];
    useProjectStore.setState({
      cueLists: [main, hot],
      activeCueListId: hot.id,
      mainSequenceListId: main.id,
      activeHotCueListId: hot.id,
    });
    useProjectStore.getState().selectCueInList(main.id, "a");
    useProjectStore.getState().selectCue("h1");

    useTransportStore.getState().go("a");

    const { handleRemoteHostCommand } = await import("./remote-host");
    handleRemoteHostCommand({ action: "go", cue_id: "h1" });

    expect(useTransportStore.getState().activeCueIds).toEqual(["a", "h1"]);
    expect(useProjectStore.getState().activeCueListId).toBe(hot.id);
    expect(getMainSequenceListFromState(useProjectStore.getState())?.selectedCueIds).toEqual(["a"]);
    expect(remoteBroadcast).toHaveBeenCalledTimes(1);
  });

  it("go-selected fires focused hot cue while main is already playing", async () => {
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
    useProjectStore.getState().selectCueInList(main.id, "b");
    useProjectStore.getState().selectCue("h1");

    const { handleRemoteHostCommand } = await import("./remote-host");
    handleRemoteHostCommand({ action: "go-selected" });

    expect(useTransportStore.getState().activeCueIds).toEqual(["a", "h1"]);
    expect(useProjectStore.getState().activeCueListId).toBe(main.id);
    expect(getMainSequenceListFromState(useProjectStore.getState())?.selectedCueIds).toEqual(["b"]);
    expect(remoteBroadcast).toHaveBeenCalledTimes(1);
  });
});
