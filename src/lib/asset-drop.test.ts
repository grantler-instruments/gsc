import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "../stores/project";
import { activeCues, resetTestProject, testCue } from "../test/fixtures/cues";
import { applyAssetPayloads, diskPathsMayHaveMedia } from "./asset-drop";

describe("diskPathsMayHaveMedia", () => {
  it("accepts media file extensions", () => {
    expect(diskPathsMayHaveMedia(["/show/assets/intro.wav"])).toBe(true);
  });

  it("rejects project bundle paths", () => {
    expect(diskPathsMayHaveMedia(["/show/show.gsc.zip"])).toBe(false);
  });
});

describe("applyAssetPayloads", () => {
  beforeEach(() => {
    resetTestProject();
  });

  it("adds cues to the list for list drops", () => {
    applyAssetPayloads([{ path: "assets/a.wav", name: "A", kind: "audio" }], { kind: "list" });

    const cues = activeCues();
    expect(cues).toHaveLength(1);
    expect(cues[0].name).toBe("A");
    expect(cues[0].assetPath).toBe("assets/a.wav");
    expect(cues[0].type).toBe("audio");
  });

  it("assigns asset to an existing media cue row", () => {
    resetTestProject([testCue("a", "Old", "audio", { assetPath: "old.wav" })]);

    applyAssetPayloads([{ path: "assets/new.wav", name: "New", kind: "audio" }], {
      kind: "row",
      cueId: "a",
    });

    const cue = activeCues()[0];
    expect(cue.name).toBe("New");
    expect(cue.assetPath).toBe("assets/new.wav");
    expect(useProjectStore.getState().cueLists[0].selectedCueIds).toEqual(["a"]);
  });

  it("adds child cues when dropped on a container row", () => {
    resetTestProject([testCue("g", "Group", "group")]);

    applyAssetPayloads([{ path: "assets/a.wav", name: "A", kind: "audio" }], {
      kind: "row",
      cueId: "g",
    });

    const child = activeCues().find((c) => c.parentId === "g");
    expect(child?.name).toBe("A");
    expect(child?.assetPath).toBe("assets/a.wav");
  });

  it("adds multiple cues to the list for multi-file drops", () => {
    applyAssetPayloads(
      [
        { path: "assets/a.wav", name: "A", kind: "audio" },
        { path: "assets/b.wav", name: "B", kind: "audio" },
        { path: "assets/c.mp4", name: "C", kind: "video" },
      ],
      { kind: "list" },
    );

    const cues = activeCues();
    expect(cues).toHaveLength(3);
    expect(cues.map((cue) => cue.name)).toEqual(["A", "B", "C"]);
    expect(useProjectStore.getState().cueLists[0].selectedCueIds).toEqual([cues[2].id]);
  });

  it("adds child cues when multiple files are dropped on a container row", () => {
    resetTestProject([testCue("g", "Group", "group")]);

    applyAssetPayloads(
      [
        { path: "assets/a.wav", name: "A", kind: "audio" },
        { path: "assets/b.wav", name: "B", kind: "audio" },
      ],
      { kind: "row", cueId: "g" },
    );

    const children = activeCues().filter((c) => c.parentId === "g");
    expect(children).toHaveLength(2);
    expect(children.map((c) => c.name)).toEqual(["A", "B"]);
  });

  it("creates list cues when row id is missing", () => {
    applyAssetPayloads([{ path: "assets/a.wav", name: "A", kind: "audio" }], {
      kind: "row",
      cueId: "missing",
    });

    expect(activeCues()).toHaveLength(1);
    expect(activeCues()[0].name).toBe("A");
  });
});
