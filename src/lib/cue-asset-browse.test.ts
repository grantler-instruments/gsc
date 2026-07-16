import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectStore } from "../stores/project";
import { useVfsStore } from "../stores/vfs";
import { activeCues, resetTestProject, testCue } from "../test/fixtures/cues";
import { vfsClear, vfsGet } from "../vfs/engine";
import { assetPayloadMatchesCue } from "./cue-asset";

vi.mock("../platform", () => ({
  getPlatform: () => "web",
}));

vi.mock("./project-session", () => ({
  persistProjectSessionAsync: vi.fn(async () => undefined),
}));

vi.mock("./media-duration", () => ({
  prefetchMediaDurations: vi.fn(),
  getMediaDurationSec: vi.fn(() => undefined),
  clearMediaDuration: vi.fn(),
}));

function audioFile(name: string, bytes: number[]): File {
  return new File([new Uint8Array(bytes)], name, { type: "audio/wav" });
}

async function browseAssignToCue(cue: ReturnType<typeof testCue>, files: File[]) {
  const imported = await useVfsStore
    .getState()
    .importFromFileList(files, { replaceExisting: true });
  const match = imported.find((asset) => assetPayloadMatchesCue(cue, asset));
  if (!match) return null;
  useProjectStore.getState().updateCue(cue.id, { assetPath: match.path });
  return match;
}

describe("browse after clearing cue asset", () => {
  beforeEach(() => {
    vfsClear();
    useVfsStore.setState({ entries: [] });
    resetTestProject([testCue("a", "Intro", "audio")]);
  });

  afterEach(() => {
    vfsClear();
    useVfsStore.setState({ entries: [] });
  });

  it("assigns a laptop file after recording, saving, and clearing the cue asset", async () => {
    const cue = activeCues()[0];

    const recorded = await browseAssignToCue(cue, [audioFile("Intro_2026-06-30.wav", [1, 2, 3])]);
    expect(recorded?.path).toBe("/assets/Intro_2026-06-30.wav");
    expect(activeCues()[0].assetPath).toBe("/assets/Intro_2026-06-30.wav");

    useProjectStore.getState().updateCue("a", { assetPath: undefined });
    expect(activeCues()[0].assetPath).toBeUndefined();

    const imported = await browseAssignToCue(cue, [audioFile("from-laptop.mp3", [4, 5, 6])]);
    expect(imported?.path).toBe("/assets/from-laptop.mp3");
    expect(activeCues()[0].assetPath).toBe("/assets/from-laptop.mp3");
    expect(vfsGet("/assets/from-laptop.mp3")?.size).toBe(3);
    expect(
      useVfsStore.getState().entries.some((entry) => entry.path === "/assets/from-laptop.mp3"),
    ).toBe(true);
  });

  it("replaces a leftover recorded asset when browsing the same filename again", async () => {
    const cue = activeCues()[0];

    await browseAssignToCue(cue, [audioFile("intro.wav", [1])]);
    useProjectStore.getState().updateCue("a", { assetPath: undefined });

    const imported = await browseAssignToCue(cue, [audioFile("intro.wav", [9, 8, 7, 6])]);
    expect(imported?.path).toBe("/assets/intro.wav");
    expect(activeCues()[0].assetPath).toBe("/assets/intro.wav");
    expect(vfsGet("/assets/intro.wav")?.size).toBe(4);
  });

  it("reports no matching media when the browse selection is the wrong type", async () => {
    const cue = activeCues()[0];
    const video = new File([new Uint8Array([1, 2, 3])], "clip.mp4", { type: "video/mp4" });

    const imported = await browseAssignToCue(cue, [video]);

    expect(imported).toBeNull();
    expect(activeCues()[0].assetPath).toBeUndefined();
  });
});
