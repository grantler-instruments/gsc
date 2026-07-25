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

function localZipEntryCompressionMethod(zip: Uint8Array, entryName: string): number {
  const decoder = new TextDecoder();
  let offset = 0;

  while (
    zip[offset] === 0x50 &&
    zip[offset + 1] === 0x4b &&
    zip[offset + 2] === 0x03 &&
    zip[offset + 3] === 0x04
  ) {
    const method = zip[offset + 8] ?? 0;
    const compressedSize =
      (zip[offset + 18] ?? 0) |
      ((zip[offset + 19] ?? 0) << 8) |
      ((zip[offset + 20] ?? 0) << 16) |
      ((zip[offset + 21] ?? 0) << 24);
    const nameLength = (zip[offset + 26] ?? 0) | ((zip[offset + 27] ?? 0) << 8);
    const extraLength = (zip[offset + 28] ?? 0) | ((zip[offset + 29] ?? 0) << 8);
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLength;
    if (decoder.decode(zip.slice(nameStart, nameEnd)) === entryName) return method;
    offset = nameEnd + extraLength + compressedSize;
  }

  throw new Error(`ZIP entry not found: ${entryName}`);
}

function byteFingerprint(bytes: Uint8Array): number {
  let fingerprint = 0x811c9dc5;
  for (const byte of bytes) fingerprint = Math.imul(fingerprint ^ byte, 0x01000193);
  return fingerprint >>> 0;
}

function corruptZipEntryData(zip: Uint8Array, entryName: string): Uint8Array {
  const corrupted = zip.slice();
  const decoder = new TextDecoder();
  let offset = 0;

  while (
    corrupted[offset] === 0x50 &&
    corrupted[offset + 1] === 0x4b &&
    corrupted[offset + 2] === 0x03 &&
    corrupted[offset + 3] === 0x04
  ) {
    const compressedSize =
      (corrupted[offset + 18] ?? 0) |
      ((corrupted[offset + 19] ?? 0) << 8) |
      ((corrupted[offset + 20] ?? 0) << 16) |
      ((corrupted[offset + 21] ?? 0) << 24);
    const nameLength = (corrupted[offset + 26] ?? 0) | ((corrupted[offset + 27] ?? 0) << 8);
    const extraLength = (corrupted[offset + 28] ?? 0) | ((corrupted[offset + 29] ?? 0) << 8);
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLength;
    if (decoder.decode(corrupted.slice(nameStart, nameEnd)) === entryName) {
      corrupted[nameEnd + extraLength] = 0xff;
      return corrupted;
    }
    offset = nameEnd + extraLength + compressedSize;
  }

  throw new Error(`ZIP entry not found: ${entryName}`);
}

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
    expect(localZipEntryCompressionMethod(zip, "assets/intro.wav")).toBe(0);
  });

  it("round-trips a large MP3 without DEFLATE compression", async () => {
    const list = createCueList("Main");
    list.cues = [
      testCue("a", "Underscore", "audio", {
        assetPath: "/assets/baerbel_beethoven_noise_cleaned.mp3",
        number: "1",
      }),
    ];
    const snapshot = cueListsToSnapshot("project-1", "Large Media Show", [list], list.id);
    const audioBytes = new Uint8Array(8 * 1024 * 1024);
    for (let i = 0; i < audioBytes.length; i += 1) {
      audioBytes[i] = (i * 31 + 17) % 256;
    }

    const { zip, missing } = await buildProjectBundleZip(
      snapshot,
      ["/assets/baerbel_beethoven_noise_cleaned.mp3"],
      () => new Blob([audioBytes], { type: "audio/mpeg" }),
    );

    expect(missing).toEqual([]);
    expect(localZipEntryCompressionMethod(zip, "assets/baerbel_beethoven_noise_cleaned.mp3")).toBe(
      0,
    );
    const { assets } = parseProjectBundleZip(zip);
    expect(assets[0]?.data.byteLength).toBe(audioBytes.byteLength);
    expect(byteFingerprint(assets[0]?.data ?? new Uint8Array())).toBe(byteFingerprint(audioBytes));
  });

  it("recovers a project when one compressed asset is corrupt", async () => {
    const list = createCueList("Main");
    list.cues = [
      testCue("a", "Damaged Audio", "audio", {
        assetPath: "/assets/damaged.mp3",
        number: "1",
      }),
    ];
    const snapshot = cueListsToSnapshot("project-1", "Recoverable Show", [list], list.id);
    const { zipSync } = await import("fflate");
    const zip = zipSync({
      "project.json": new TextEncoder().encode(JSON.stringify(snapshot)),
      "assets/damaged.mp3": new Uint8Array(1024).fill(42),
    });

    const { snapshot: recovered, assets } = parseProjectBundleZip(
      corruptZipEntryData(zip, "assets/damaged.mp3"),
    );

    expect(recovered.name).toBe("Recoverable Show");
    expect(assets).toEqual([]);
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
