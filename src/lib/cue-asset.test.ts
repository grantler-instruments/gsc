import { describe, expect, it } from "vitest";
import type { VfsEntry } from "../stores/vfs";
import { testCue } from "../test/fixtures/cues";
import { getCueAssetWarning } from "./cue-asset";

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
