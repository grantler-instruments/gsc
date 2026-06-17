import { afterEach, describe, expect, it } from "vitest";
import { testCue } from "../test/fixtures/cues";
import { vfsClear, vfsGet } from "../vfs/engine";
import { createCueList } from "./cue-lists";
import {
  buildProjectBundleZip,
  hydrateVfsFromBundleAssets,
  parseProjectBundleZip,
  projectBundleDiskFiles,
} from "./project-bundle";
import { cueListsToSnapshot } from "./project-snapshot";

describe("project-bundle", () => {
  afterEach(() => {
    vfsClear();
  });

  it("round-trips snapshot and assets through zip", async () => {
    const list = createCueList("Main");
    list.cues = [testCue("a", "Intro", "audio", { assetPath: "/assets/intro.wav", number: "1" })];
    const snapshot = cueListsToSnapshot("project-1", "Test Show", [list], list.id);
    const audioBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46]);

    const { zip, missing } = await buildProjectBundleZip(snapshot, ["/assets/intro.wav"], (path) =>
      path === "/assets/intro.wav" ? new Blob([audioBytes], { type: "audio/wav" }) : undefined,
    );

    expect(missing).toEqual([]);

    const { snapshot: parsed, assets } = parseProjectBundleZip(zip);
    expect(parsed.name).toBe("Test Show");
    expect(parsed.cueLists[0]?.cues[0]?.assetPath).toBe("/assets/intro.wav");
    expect(assets).toHaveLength(1);
    expect(assets[0]?.path).toBe("/assets/intro.wav");
    expect(assets[0]?.data).toEqual(audioBytes);
  });

  it("reports missing assets during export", async () => {
    const list = createCueList("Main");
    list.cues = [testCue("a", "Intro", "audio", { assetPath: "/assets/missing.wav", number: "1" })];
    const snapshot = cueListsToSnapshot("project-1", "Test Show", [list], list.id);

    const { zip, missing } = await buildProjectBundleZip(
      snapshot,
      ["/assets/missing.wav"],
      () => undefined,
    );

    expect(missing).toEqual(["/assets/missing.wav"]);
    const { snapshot: parsed, assets } = parseProjectBundleZip(zip);
    expect(parsed.name).toBe("Test Show");
    expect(assets).toEqual([]);
  });

  it("rejects bundles without a v2 project.json", () => {
    const invalid = new TextEncoder().encode("not a zip");
    expect(() => parseProjectBundleZip(invalid)).toThrow();
  });

  it("rejects bundles with an unsupported project.json version", async () => {
    const list = createCueList("Main");
    const snapshot = cueListsToSnapshot("project-1", "Legacy Show", [list], list.id);
    const legacySnapshot = { ...snapshot, version: 1 as const };
    const { zipSync } = await import("fflate");
    const zip = zipSync({
      "project.json": new TextEncoder().encode(JSON.stringify(legacySnapshot)),
    });
    expect(() => parseProjectBundleZip(zip)).toThrow();
  });

  it("hydrates vfs from bundle assets", () => {
    const bytes = new Uint8Array([1, 2, 3]);
    hydrateVfsFromBundleAssets([{ path: "/assets/test.wav", data: bytes }]);
    const blob = vfsGet("/assets/test.wav");
    expect(blob).toBeDefined();
    expect(blob?.size).toBe(3);
  });

  it("flattens bundle zip into disk files", async () => {
    const list = createCueList("Main");
    const snapshot = cueListsToSnapshot("project-1", "Disk Show", [list], list.id);
    const assetBytes = new Uint8Array([9, 8, 7]);

    const { zip } = await buildProjectBundleZip(
      snapshot,
      ["/assets/clip.wav"],
      () => new Blob([assetBytes], { type: "audio/wav" }),
    );

    const { snapshot: parsed, files } = projectBundleDiskFiles(zip);
    expect(parsed.name).toBe("Disk Show");
    expect(files.map((file) => file.relativePath).sort()).toEqual([
      "assets/clip.wav",
      "project.json",
    ]);
    const assetFile = files.find((file) => file.relativePath === "assets/clip.wav");
    expect(assetFile?.data).toEqual(assetBytes);
  });
});
