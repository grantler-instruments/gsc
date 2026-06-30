import { describe, expect, it, vi } from "vitest";
import { testCue } from "../test/fixtures/cues";
import { createCueList } from "./cue-lists";
import { buildMultiviewPreviewState, buildOutputState } from "./output-state";

vi.mock("../platform/vfs-asset", () => ({
  resolveAssetBlob: vi.fn(async () => new Blob()),
}));

vi.mock("../vfs/engine", () => ({
  vfsGetObjectUrl: vi.fn(() => "blob:mock"),
}));

vi.mock("./media-duration", () => ({
  getMediaDurationSec: vi.fn(() => 10),
}));

describe("buildOutputState", () => {
  it("routes unassigned visual cues to master output only", async () => {
    const { useProjectStore } = await import("../stores/project");
    const { useTransportStore } = await import("../stores/transport");

    const list = createCueList("Main");
    list.cues = [
      testCue("v1", "Main clip", "video", { assetPath: "/assets/main.mp4" }),
      testCue("v2", "Lobby clip", "video", {
        assetPath: "/assets/lobby.mp4",
        videoBusId: "bus-lobby",
      }),
    ];

    useProjectStore.setState({
      cueLists: [list],
      activeCueListId: list.id,
      videoBuses: [{ id: "bus-lobby", name: "Lobby", opacity: 1 }],
    });
    useTransportStore.setState({
      activeCueIds: ["v1", "v2"],
      cueStartedAtMs: { v1: 1000, v2: 1000 },
    });

    const master = await buildOutputState(1, undefined);
    const lobby = await buildOutputState(1, "bus-lobby");

    expect(master.layers.map((layer) => layer.cueId)).toEqual(["v1"]);
    expect(master.busName).toBe("Main");
    expect(lobby.layers.map((layer) => layer.cueId)).toEqual(["v2"]);
    expect(lobby.busId).toBe("bus-lobby");
    expect(lobby.busName).toBe("Lobby");
  });

  it("resolves active cues from any cue list", async () => {
    const { useProjectStore } = await import("../stores/project");
    const { useTransportStore } = await import("../stores/transport");

    const main = createCueList("Main");
    main.cues = [testCue("v1", "Main clip", "video", { assetPath: "/assets/main.mp4" })];
    const backup = createCueList("Backup");
    backup.cues = [testCue("v2", "Backup clip", "video", { assetPath: "/assets/backup.mp4" })];

    useProjectStore.setState({
      cueLists: [main, backup],
      activeCueListId: backup.id,
      videoBuses: [],
    });
    useTransportStore.setState({
      activeCueIds: ["v1", "v2"],
      cueStartedAtMs: { v1: 1000, v2: 1000 },
    });

    const master = await buildOutputState(1, undefined);

    expect(master.layers.map((layer) => layer.cueId).sort()).toEqual(["v1", "v2"]);
  });
});

describe("buildMultiviewPreviewState", () => {
  it("builds one preview tile per output window", async () => {
    const { useProjectStore } = await import("../stores/project");
    const { useTransportStore } = await import("../stores/transport");

    const list = createCueList("Main");
    list.cues = [
      testCue("v1", "Main clip", "video", { assetPath: "/assets/main.mp4" }),
      testCue("v2", "Lobby clip", "video", {
        assetPath: "/assets/lobby.mp4",
        videoBusId: "bus-lobby",
      }),
    ];

    useProjectStore.setState({
      cueLists: [list],
      activeCueListId: list.id,
      videoBuses: [{ id: "bus-lobby", name: "Lobby", opacity: 1 }],
    });
    useTransportStore.setState({
      activeCueIds: ["v1", "v2"],
      cueStartedAtMs: { v1: 1000, v2: 1000 },
    });

    const preview = await buildMultiviewPreviewState(2);

    expect(preview.destinations).toHaveLength(2);
    expect(preview.destinations[0]?.busName).toBe("Main");
    expect(preview.destinations[0]?.layers.map((layer) => layer.cueId)).toEqual(["v1"]);
    expect(preview.destinations[1]?.busId).toBe("bus-lobby");
    expect(preview.destinations[1]?.layers.map((layer) => layer.cueId)).toEqual(["v2"]);
  });
});
