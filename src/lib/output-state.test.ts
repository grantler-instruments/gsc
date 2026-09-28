import { describe, expect, it, vi } from "vitest";
import { testCue } from "../test/fixtures/cues";
import { MASTER_VIDEO_OUTPUT_ID } from "../types/video-output";
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
      videoOutputs: [
        { id: MASTER_VIDEO_OUTPUT_ID, name: "Main", kind: "window" },
        { id: "out-lobby", name: "Lobby wall", kind: "window", busId: "bus-lobby" },
      ],
      masterVideoOutputName: "Main",
    });
    useTransportStore.setState({
      activeCueIds: ["v1", "v2"],
      cueStartedAtMs: { v1: 1000, v2: 1000 },
    });

    const master = await buildOutputState(1, MASTER_VIDEO_OUTPUT_ID);
    const lobby = await buildOutputState(1, "out-lobby");

    expect(master.layers.map((layer) => layer.cueId)).toEqual(["v1"]);
    expect(master.outputId).toBe(MASTER_VIDEO_OUTPUT_ID);
    expect(master.busName).toBe("Main");
    expect(lobby.layers.map((layer) => layer.cueId)).toEqual(["v2"]);
    expect(lobby.busId).toBe("bus-lobby");
    expect(lobby.outputName).toBe("Lobby wall");
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
      videoOutputs: [{ id: MASTER_VIDEO_OUTPUT_ID, name: "Main", kind: "window" }],
      masterVideoOutputName: "Main",
    });
    useTransportStore.setState({
      activeCueIds: ["v1", "v2"],
      cueStartedAtMs: { v1: 1000, v2: 1000 },
    });

    const master = await buildOutputState(1, MASTER_VIDEO_OUTPUT_ID);

    expect(master.layers.map((layer) => layer.cueId).sort()).toEqual(["v1", "v2"]);
  });

  it("lets multiple outputs show the same program bus", async () => {
    const { useProjectStore } = await import("../stores/project");
    const { useTransportStore } = await import("../stores/transport");

    const list = createCueList("Main");
    list.cues = [
      testCue("v2", "Lobby clip", "video", {
        assetPath: "/assets/lobby.mp4",
        videoBusId: "bus-lobby",
      }),
    ];

    useProjectStore.setState({
      cueLists: [list],
      activeCueListId: list.id,
      videoBuses: [{ id: "bus-lobby", name: "Lobby", opacity: 1 }],
      videoOutputs: [
        { id: MASTER_VIDEO_OUTPUT_ID, name: "Main", kind: "window" },
        { id: "proj", name: "Projector", kind: "window", busId: "bus-lobby" },
        { id: "ndi-1", name: "NDI Lobby", kind: "ndi", busId: "bus-lobby" },
      ],
      masterVideoOutputName: "Main",
    });
    useTransportStore.setState({
      activeCueIds: ["v2"],
      cueStartedAtMs: { v2: 1000 },
    });

    const projector = await buildOutputState(1, "proj");
    const ndi = await buildOutputState(1, "ndi-1");

    expect(projector.layers.map((layer) => layer.cueId)).toEqual(["v2"]);
    expect(ndi.layers.map((layer) => layer.cueId)).toEqual(["v2"]);
    expect(projector.busId).toBe("bus-lobby");
    expect(ndi.busId).toBe("bus-lobby");
  });
});

describe("buildMultiviewPreviewState", () => {
  it("builds one preview tile per video output", async () => {
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
      videoOutputs: [
        { id: MASTER_VIDEO_OUTPUT_ID, name: "Main", kind: "window" },
        { id: "out-lobby", name: "Lobby wall", kind: "window", busId: "bus-lobby" },
      ],
      masterVideoOutputName: "Main",
    });
    useTransportStore.setState({
      activeCueIds: ["v1", "v2"],
      cueStartedAtMs: { v1: 1000, v2: 1000 },
    });

    const preview = await buildMultiviewPreviewState(2);

    expect(preview.destinations).toHaveLength(2);
    expect(preview.destinations[0]?.outputId).toBe(MASTER_VIDEO_OUTPUT_ID);
    expect(preview.destinations[0]?.busName).toBe("Main");
    expect(preview.destinations[0]?.layers.map((layer) => layer.cueId)).toEqual(["v1"]);
    expect(preview.destinations[1]?.busId).toBe("bus-lobby");
    expect(preview.destinations[1]?.outputName).toBe("Lobby wall");
    expect(preview.destinations[1]?.layers.map((layer) => layer.cueId)).toEqual(["v2"]);
  });

  it("includes bus effects and opacity in preview destinations", async () => {
    const { useProjectStore } = await import("../stores/project");
    const { useTransportStore } = await import("../stores/transport");

    const list = createCueList("Main");
    list.cues = [
      testCue("v2", "Lobby clip", "video", {
        assetPath: "/assets/lobby.mp4",
        videoBusId: "bus-lobby",
      }),
    ];

    useProjectStore.setState({
      cueLists: [list],
      activeCueListId: list.id,
      videoBuses: [
        {
          id: "bus-lobby",
          name: "Lobby",
          opacity: 0.75,
          effects: [
            {
              id: "fx-blur",
              type: "blur",
              enabled: true,
              params: { radius: 4, mix: 1 },
            },
          ],
        },
      ],
      videoOutputs: [
        { id: MASTER_VIDEO_OUTPUT_ID, name: "Main", kind: "window" },
        { id: "out-lobby", name: "Lobby wall", kind: "window", busId: "bus-lobby" },
      ],
      masterVideoOutputName: "Main",
    });
    useTransportStore.setState({
      activeCueIds: ["v2"],
      cueStartedAtMs: { v2: 1000 },
    });

    const preview = await buildMultiviewPreviewState(3);
    const lobby = preview.destinations.find((destination) => destination.busId === "bus-lobby");

    expect(lobby?.busOpacity).toBe(0.75);
    expect(lobby?.busEffects).toEqual([
      {
        id: "fx-blur",
        type: "blur",
        enabled: true,
        params: { radius: 4, mix: 1 },
      },
    ]);
  });

  it("includes master output effects and opacity on the main destination", async () => {
    const { useProjectStore } = await import("../stores/project");
    const { useTransportStore } = await import("../stores/transport");

    const list = createCueList("Main");
    list.cues = [testCue("v1", "Main clip", "video", { assetPath: "/assets/main.mp4" })];

    useProjectStore.setState({
      cueLists: [list],
      activeCueListId: list.id,
      videoBuses: [],
      videoOutputs: [{ id: MASTER_VIDEO_OUTPUT_ID, name: "Main", kind: "window" }],
      masterVideoOutputName: "Main",
      masterVideoOutputOpacity: 0.5,
      masterVideoOutputEffects: [
        {
          id: "fx-grade",
          type: "colorGrade",
          enabled: true,
          params: { brightness: 0.1, contrast: 1, saturation: 1 },
        },
      ],
    });
    useTransportStore.setState({
      activeCueIds: ["v1"],
      cueStartedAtMs: { v1: 1000 },
    });

    const master = await buildOutputState(4, MASTER_VIDEO_OUTPUT_ID);
    const preview = await buildMultiviewPreviewState(4);

    expect(master.busOpacity).toBe(0.5);
    expect(master.busEffects?.[0]?.type).toBe("colorGrade");
    expect(preview.destinations[0]?.busOpacity).toBe(0.5);
    expect(preview.destinations[0]?.busEffects?.[0]?.type).toBe("colorGrade");
  });
});
