import { describe, expect, it, vi } from "vitest";
import type { VfsEntry } from "../stores/vfs";
import { testCue } from "../test/fixtures/cues";
import { cueMissingAsset, getCueAssetWarning } from "./cue-asset";

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
