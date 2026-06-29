import { afterEach, describe, expect, it } from "vitest";
import { testCue } from "../test/fixtures/cues";
import { vfsClear, vfsGet, vfsPut } from "../vfs/engine";
import { createCueList } from "./cue-lists";
import {
  buildProjectBundleZip,
  parseProjectBundleZip,
  projectBundleDiskFiles,
} from "./project-bundle";
import {
  diskPathForAsset,
  hydrateVfsFromDisk,
  projectJsonDiskPath,
  virtualPathsFromRelativeFiles,
  writeBundleFilesToDisk,
} from "./project-disk";
import { collectSessionAssetPaths } from "./project-session";
import { cueListsToSnapshot, snapshotToCueLists } from "./project-snapshot";

/**
 * Simulates the native desktop export → reimport flow without `@tauri-apps/plugin-fs`.
 *
 * The OS-level desktop e2e runner can't cover macOS (Tauri WebDriver has no WKWebView
 * driver) and can't drive native save/open dialogs, so the only cross-platform difference
 * worth exercising deterministically is the path separator: Windows roots use `\`, while
 * macOS and Linux roots use `/`. This test runs the real separator-sensitive helpers
 * against an in-memory disk for each platform.
 */
function createFakeDisk() {
  const files = new Map<string, Uint8Array>();
  return {
    files,
    writeFile: async (diskPath: string, data: Uint8Array): Promise<void> => {
      files.set(diskPath, data);
    },
    mkdir: async (): Promise<void> => {
      /* directories are implicit in the flat map */
    },
    readFile: async (diskPath: string): Promise<Uint8Array | null> => files.get(diskPath) ?? null,
    /** Mirrors collectRelativeFiles(assetsDir, "assets") from project-storage.tauri.ts. */
    relativeAssetFiles: (rootDir: string): string[] => {
      const sep = rootDir.includes("\\") ? "\\" : "/";
      const assetsPrefix = `${rootDir.replace(/[/\\]+$/, "")}${sep}assets${sep}`;
      return [...files.keys()]
        .filter((diskPath) => diskPath.startsWith(assetsPrefix))
        .map((diskPath) => `assets/${diskPath.slice(assetsPrefix.length).replace(/\\/g, "/")}`);
    },
  };
}

describe("desktop bundle export → reimport round trip", () => {
  afterEach(() => {
    vfsClear();
  });

  const platforms: Array<{ os: string; rootDir: string; sep: "/" | "\\" }> = [
    { os: "linux", rootDir: "/home/user/Shows/My Show.gsc", sep: "/" },
    { os: "macos", rootDir: "/Users/user/Shows/My Show.gsc", sep: "/" },
    { os: "windows", rootDir: "C:\\Users\\user\\Shows\\My Show.gsc", sep: "\\" },
  ];

  for (const { os, rootDir, sep } of platforms) {
    it(`preserves cues and assets when exporting and reimporting on ${os}`, async () => {
      // Build a show with one audio cue + asset.
      const list = createCueList("Main");
      list.cues = [testCue("a", "Intro", "audio", { assetPath: "/assets/intro.wav", number: "1" })];
      const snapshot = cueListsToSnapshot("project-1", "My Show", [list], list.id);
      const audioBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4]);
      vfsPut("/assets/intro.wav", new Blob([audioBytes], { type: "audio/wav" }));

      // Export (exportProjectBundleTauri flow).
      const exportPaths = collectSessionAssetPaths(snapshot, [{ path: "/assets/intro.wav" }]);
      const { zip, missing } = await buildProjectBundleZip(snapshot, exportPaths, vfsGet);
      expect(missing).toEqual([]);

      // Reimport: extract the bundle into a fresh .gsc folder, then load it.
      vfsClear();
      const disk = createFakeDisk();
      const { files } = projectBundleDiskFiles(zip);
      await writeBundleFilesToDisk(rootDir, files, disk.writeFile, disk.mkdir);

      // project.json is written at the platform-correct disk path.
      const jsonPath = projectJsonDiskPath(rootDir);
      const jsonBytes = await disk.readFile(jsonPath);
      expect(jsonBytes).toBeTruthy();
      const reloaded = snapshotToCueLists(
        JSON.parse(new TextDecoder().decode(jsonBytes as Uint8Array)),
      );
      expect(reloaded.name).toBe("My Show");
      expect(reloaded.cueLists[0]?.cues[0]?.assetPath).toBe("/assets/intro.wav");

      // The asset uses the platform's separators on disk (no mixed separators).
      const assetDiskPath = diskPathForAsset(rootDir, "/assets/intro.wav");
      expect(assetDiskPath.startsWith(rootDir)).toBe(true);
      if (sep === "\\") {
        expect(assetDiskPath).not.toContain("/");
      } else {
        expect(assetDiskPath).not.toContain("\\");
      }
      expect(await disk.readFile(assetDiskPath)).toEqual(audioBytes);

      // Hydrate the VFS back from disk (loadProjectFromFolder flow).
      const virtualPaths = virtualPathsFromRelativeFiles(disk.relativeAssetFiles(rootDir));
      expect(virtualPaths).toEqual(["/assets/intro.wav"]);
      await hydrateVfsFromDisk(rootDir, virtualPaths, disk.readFile);

      const blob = vfsGet("/assets/intro.wav");
      expect(blob).toBeDefined();
      expect(new Uint8Array(await (blob as Blob).arrayBuffer())).toEqual(audioBytes);

      // The exported bundle itself still parses on the receiving side.
      const { assets } = parseProjectBundleZip(zip);
      expect(assets).toHaveLength(1);
      expect(assets[0]?.path).toBe("/assets/intro.wav");
    });
  }
});
