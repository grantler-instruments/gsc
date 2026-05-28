import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetTestProject, testCue } from "../test/fixtures/cues";
import { useProjectStore } from "../stores/project";

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
