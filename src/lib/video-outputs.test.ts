import { describe, expect, it } from "vitest";
import { MASTER_VIDEO_OUTPUT_ID } from "../types/video-output";
import { normalizeVideoOutputFrame } from "./video-output-frame";
import {
  createVideoOutput,
  ensureMasterWindowOutput,
  migrateVideoOutputsFromBuses,
  normalizeVideoOutputs,
  resolveOutputBusId,
} from "./video-outputs";

describe("migrateVideoOutputsFromBuses", () => {
  it("creates master + paired outputs from legacy buses and frames", () => {
    const busFrame = normalizeVideoOutputFrame({
      crop: { x: 0.1, y: 0, w: 0.8, h: 1 },
      dest: { x: 0, y: 0, w: 1, h: 1 },
    });
    const masterFrame = normalizeVideoOutputFrame({
      crop: { x: 0, y: 0, w: 1, h: 1 },
      dest: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 },
    });
    const { buses, outputs } = migrateVideoOutputsFromBuses(
      [
        {
          id: "b1",
          name: "Lobby",
          opacity: 0.8,
          outputFrame: busFrame,
        },
      ],
      "House",
      masterFrame,
    );

    expect(buses).toEqual([{ id: "b1", name: "Lobby", opacity: 0.8 }]);
    expect(outputs).toHaveLength(2);
    expect(outputs[0]).toMatchObject({
      id: MASTER_VIDEO_OUTPUT_ID,
      name: "House",
      kind: "window",
    });
    expect(outputs[0]?.outputFrame).toBeTruthy();
    expect(outputs[1]).toMatchObject({
      id: "b1",
      name: "Lobby",
      kind: "window",
      busId: "b1",
    });
    expect(outputs[1]?.outputFrame).toBeTruthy();
  });

  it("keeps existing outputs when present", () => {
    const { outputs } = migrateVideoOutputsFromBuses(
      [{ id: "b1", name: "Lobby", opacity: 1 }],
      "Main",
      undefined,
      [{ id: "custom", name: "Foldback", kind: "window", busId: "b1" }],
    );

    expect(outputs.map((o) => o.id)).toEqual(["custom"]);
  });
});

describe("normalizeVideoOutputs", () => {
  it("clears stale bus assignments", () => {
    expect(
      normalizeVideoOutputs(
        [{ id: "o1", name: "A", kind: "window", busId: "missing" }],
        [{ id: "b1", name: "Lobby", opacity: 1 }],
      ),
    ).toEqual([{ id: "o1", name: "A", kind: "window" }]);
  });
});

describe("createVideoOutput / resolveOutputBusId", () => {
  it("creates a window output by default", () => {
    const output = createVideoOutput([], [], { name: "Projector" });
    expect(output.kind).toBe("window");
    expect(output.name).toBe("Projector");
  });

  it("resolves program bus ids", () => {
    const buses = [{ id: "b1", name: "Lobby", opacity: 1 }];
    expect(resolveOutputBusId({ busId: "b1" }, buses)).toBe("b1");
    expect(resolveOutputBusId({ busId: "missing" }, buses)).toBeUndefined();
    expect(resolveOutputBusId({}, buses)).toBeUndefined();
  });
});

describe("ensureMasterWindowOutput", () => {
  it("injects a master window when none exist", () => {
    const outputs = ensureMasterWindowOutput(
      [{ id: "ndi-1", name: "NDI", kind: "ndi" }],
      [],
      "Main",
    );
    expect(outputs[0]?.id).toBe(MASTER_VIDEO_OUTPUT_ID);
    expect(outputs[0]?.kind).toBe("window");
    expect(outputs).toHaveLength(2);
  });
});
