import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVfsStore } from "../stores/vfs";
import { vfsClear, vfsGet } from "../vfs/engine";
import { ttsAssetPath } from "./tts";
import { importGeneratedAudioAsset } from "./tts-asset";

vi.mock("../platform", () => ({
  getPlatform: () => "web",
}));

vi.mock("./project-session", () => ({
  persistProjectSessionAsync: vi.fn(async () => undefined),
}));

vi.mock("./media-duration", () => ({
  prefetchMediaDurations: vi.fn(),
}));

describe("importGeneratedAudioAsset", () => {
  beforeEach(() => {
    vfsClear();
    useVfsStore.setState({ entries: [] });
  });

  afterEach(() => {
    vfsClear();
    useVfsStore.setState({ entries: [] });
  });

  it("stores the wav in VFS and registers an audio asset entry", async () => {
    const path = ttsAssetPath("abc");
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/wav" });

    await importGeneratedAudioAsset(path, blob);

    expect(path).toBe("/assets/tts/cue-abc.wav");
    expect(vfsGet(path)?.size).toBe(4);
    const entry = useVfsStore.getState().entries.find((e) => e.path === path);
    expect(entry).toMatchObject({
      path,
      name: "cue-abc.wav",
      size: 4,
      mimeType: "audio/wav",
      kind: "audio",
      loaded: true,
    });
  });
});
