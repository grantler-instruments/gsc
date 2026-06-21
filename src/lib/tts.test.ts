import { describe, expect, it } from "vitest";
import { testCue } from "../test/fixtures/cues";
import {
  buildTtsGeneratedKey,
  getTtsCueWarning,
  getTtsGeneratedKey,
  isTtsGenerationStale,
  ttsAssetPath,
} from "./tts";

describe("tts helpers", () => {
  it("builds stable generated keys", () => {
    expect(buildTtsGeneratedKey(" Hello ", "af_heart", 1)).toBe("af_heart|1|Hello");
  });

  it("detects stale generation when text changes", () => {
    const cue = testCue("s1", "Speech", "tts", {
      ttsText: "Hello",
      ttsVoice: "af_heart",
      ttsSpeed: 1,
      assetPath: ttsAssetPath("s1"),
      ttsGeneratedKey: buildTtsGeneratedKey("Hello", "af_heart", 1),
    });
    expect(isTtsGenerationStale(cue)).toBe(false);
    expect(isTtsGenerationStale({ ...cue, ttsText: "Goodbye" })).toBe(true);
  });

  it("reports warnings for missing text and stale assets", () => {
    const empty = testCue("s1", "Speech", "tts");
    expect(getTtsCueWarning(empty)?.title).toBeTruthy();

    const stale = testCue("s2", "Speech", "tts", {
      ttsText: "Line",
      assetPath: ttsAssetPath("s2"),
      ttsGeneratedKey: "old-key",
    });
    expect(getTtsCueWarning(stale)?.title).toBeTruthy();

    const ready = testCue("s3", "Speech", "tts", {
      ttsText: "Line",
      ttsVoice: "af_heart",
      ttsSpeed: 1,
      assetPath: ttsAssetPath("s3"),
      ttsGeneratedKey: getTtsGeneratedKey({
        ...testCue("s3", "Speech", "tts"),
        ttsText: "Line",
        ttsVoice: "af_heart",
        ttsSpeed: 1,
      }),
    });
    expect(getTtsCueWarning(ready)).toBeNull();
  });
});
