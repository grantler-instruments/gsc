import { describe, expect, it, vi } from "vitest";
import type { VfsEntry } from "../stores/vfs";
import { testCue } from "../test/fixtures/cues";
import {
  countActiveAssetFilters,
  createDefaultAssetKindFilter,
  cueMissingAsset,
  cueUsesAsset,
  filterAndSortAssets,
  getCueAssetWarning,
} from "./cue-asset";

vi.mock("../platform/remote-mode", () => ({
  isRemoteClient: vi.fn(() => false),
}));

const audioEntry: VfsEntry = {
  path: "/assets/intro.wav",
  name: "intro.wav",
  size: 0,
  mimeType: "",
  kind: "audio",
  loaded: false,
};

describe("cueUsesAsset", () => {
  it("matches cue asset paths after normalization", () => {
    const cue = testCue("a", "Intro", "audio", { assetPath: "/assets/intro.wav" });
    expect(cueUsesAsset(cue, "/assets/intro.wav")).toBe(true);
    expect(cueUsesAsset(cue, "assets/intro.wav")).toBe(true);
    expect(cueUsesAsset(cue, "/assets/other.wav")).toBe(false);
    expect(cueUsesAsset(cue, null)).toBe(false);
  });
});

describe("getCueAssetWarning", () => {
  it("reports re-import when metadata exists but the file is unavailable", () => {
    const cue = testCue("a", "Intro", "audio", { assetPath: "/assets/intro.wav" });
    const warning = getCueAssetWarning(cue, [audioEntry]);
    expect(warning?.detail).toBe("File not available — re-import in Assets");
  });

  it("reports missing project asset when no entry exists", () => {
    const cue = testCue("a", "Intro", "audio", { assetPath: "/assets/ghost.wav" });
    const warning = getCueAssetWarning(cue, []);
    expect(warning?.detail).toBe("Asset missing from project");
  });
});

describe("remote client", () => {
  it("does not warn about missing media assets", async () => {
    const { isRemoteClient } = await import("../platform/remote-mode");
    vi.mocked(isRemoteClient).mockReturnValue(true);

    const cue = testCue("a", "Intro", "audio", { assetPath: "/assets/ghost.wav" });
    expect(getCueAssetWarning(cue, [])).toBeNull();
    expect(cueMissingAsset(cue, [])).toBe(false);
  });
});

describe("filterAndSortAssets", () => {
  const entries: VfsEntry[] = [
    { ...audioEntry, name: "zebra.wav", path: "/assets/zebra.wav", kind: "audio", loaded: true },
    {
      path: "/assets/logo.png",
      name: "logo.png",
      size: 0,
      mimeType: "",
      kind: "image",
      loaded: true,
    },
    {
      path: "/assets/clip.mp4",
      name: "clip.mp4",
      size: 0,
      mimeType: "",
      kind: "video",
      loaded: true,
    },
  ];

  it("filters by type and search query", () => {
    const filtered = filterAndSortAssets(entries, {
      query: "logo",
      enabledKinds: new Set(["image"]),
      sort: "name-asc",
    });
    expect(filtered.map((entry) => entry.path)).toEqual(["/assets/logo.png"]);
  });

  it("sorts by type then name", () => {
    const sorted = filterAndSortAssets(entries, {
      query: "",
      enabledKinds: createDefaultAssetKindFilter(),
      sort: "type-asc",
    });
    expect(sorted.map((entry) => entry.kind)).toEqual(["audio", "video", "image"]);
  });
});

describe("countActiveAssetFilters", () => {
  it("counts search and type filters separately", () => {
    expect(countActiveAssetFilters("", createDefaultAssetKindFilter())).toBe(0);
    expect(countActiveAssetFilters("logo", createDefaultAssetKindFilter())).toBe(1);
    expect(countActiveAssetFilters("", new Set(["audio"]))).toBe(1);
    expect(countActiveAssetFilters("logo", new Set(["image"]))).toBe(2);
  });
});
