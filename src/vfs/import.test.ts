import { afterEach, describe, expect, it, vi } from "vitest";
import { getCachedAudioBuffer } from "../audio/buffer-cache";
import { clearMediaDuration, getMediaDurationSec } from "../lib/media-duration";
import { vfsClear, vfsGet, vfsHas } from "./engine";
import { importFiles } from "./import";

vi.mock("../lib/media-duration", () => ({
  prefetchMediaDurations: vi.fn(),
  getMediaDurationSec: vi.fn(() => undefined),
  clearMediaDuration: vi.fn(),
}));

function audioFile(name: string, bytes: number[]): File {
  return new File([new Uint8Array(bytes)], name, { type: "audio/wav" });
}

describe("importFiles", () => {
  afterEach(() => {
    vfsClear();
  });

  it("stores a new file under /assets", async () => {
    const imported = await importFiles([audioFile("track.wav", [1, 2, 3])]);

    expect(imported).toEqual([
      expect.objectContaining({
        path: "/assets/track.wav",
        name: "track.wav",
        kind: "audio",
      }),
    ]);
    expect(vfsHas("/assets/track.wav")).toBe(true);
    expect(vfsGet("/assets/track.wav")?.size).toBe(3);
  });

  it("replaceExisting overwrites an orphaned asset at the same path", async () => {
    await importFiles([audioFile("intro.wav", [1])]);
    expect(vfsGet("/assets/intro.wav")?.size).toBe(1);

    const imported = await importFiles([audioFile("intro.wav", [9, 8, 7, 6])], {
      replaceExisting: true,
    });

    expect(imported).toHaveLength(1);
    expect(vfsGet("/assets/intro.wav")?.size).toBe(4);
  });

  it("without replaceExisting keeps the first blob when paths collide", async () => {
    await importFiles([audioFile("intro.wav", [1])]);

    const imported = await importFiles([audioFile("intro.wav", [9, 8, 7])]);

    expect(imported).toHaveLength(1);
    expect(vfsGet("/assets/intro.wav")?.size).toBe(1);
  });

  it("replaceExisting clears cached decode metadata for the replaced path", async () => {
    await importFiles([audioFile("clip.wav", [1, 2, 3, 4, 5, 6, 7, 8])]);
    await importFiles([audioFile("clip.wav", [1, 2, 3, 4, 5, 6, 7, 8])], {
      replaceExisting: true,
    });

    expect(clearMediaDuration).toHaveBeenCalledWith("/assets/clip.wav");
    expect(getCachedAudioBuffer("/assets/clip.wav")).toBeUndefined();
    expect(getMediaDurationSec("/assets/clip.wav")).toBeUndefined();
  });
});
