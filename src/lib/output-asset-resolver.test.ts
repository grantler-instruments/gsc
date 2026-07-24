import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { exists, readFile } = vi.hoisted(() => ({
  exists: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("../platform", () => ({
  getPlatform: vi.fn(() => "tauri"),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: (...args: unknown[]) => exists(...args),
  readFile: (...args: unknown[]) => readFile(...args),
}));

vi.mock("./asset-cache", () => ({
  getCachedAsset: vi.fn(async () => undefined),
}));

vi.mock("./output-asset-bridge", () => ({
  getOutputAssetBlob: vi.fn(() => undefined),
  getOutputAssetObjectUrl: vi.fn(() => undefined),
}));

import { getPlatform } from "../platform";
import {
  resetOutputAssetResolverForTests,
  resolveOutputAssetObjectUrl,
} from "./output-asset-resolver";

describe("resolveOutputAssetObjectUrl", () => {
  beforeEach(() => {
    resetOutputAssetResolverForTests();
    vi.mocked(getPlatform).mockReturnValue("tauri");
    exists.mockReset();
    readFile.mockReset();
  });

  afterEach(() => {
    resetOutputAssetResolverForTests();
  });

  it("reads video bytes from the project root on Tauri (Windows-style path)", async () => {
    exists.mockResolvedValue(true);
    readFile.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));

    const url = await resolveOutputAssetObjectUrl(
      "project-1",
      "C:\\Users\\show\\Demo.gsc",
      "video/clip.mp4",
    );

    expect(exists).toHaveBeenCalledWith("C:\\Users\\show\\Demo.gsc\\assets\\video\\clip.mp4");
    expect(readFile).toHaveBeenCalledWith("C:\\Users\\show\\Demo.gsc\\assets\\video\\clip.mp4");
    expect(url).toMatch(/^blob:/);

    // Cached — no second disk read.
    exists.mockClear();
    readFile.mockClear();
    const cached = await resolveOutputAssetObjectUrl(
      "project-1",
      "C:\\Users\\show\\Demo.gsc",
      "video/clip.mp4",
    );
    expect(cached).toBe(url);
    expect(exists).not.toHaveBeenCalled();
    expect(readFile).not.toHaveBeenCalled();
  });

  it("returns undefined when the file is missing on disk", async () => {
    exists.mockResolvedValue(false);

    const url = await resolveOutputAssetObjectUrl(
      "project-1",
      "C:\\Users\\show\\Demo.gsc",
      "video/missing.mp4",
    );

    expect(url).toBeUndefined();
    expect(readFile).not.toHaveBeenCalled();
  });

  it("does not touch the filesystem on web", async () => {
    vi.mocked(getPlatform).mockReturnValue("web");

    const url = await resolveOutputAssetObjectUrl("project-1", "/tmp/Demo.gsc", "video/clip.mp4");

    expect(url).toBeUndefined();
    expect(exists).not.toHaveBeenCalled();
    expect(readFile).not.toHaveBeenCalled();
  });
});
