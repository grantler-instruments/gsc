import { describe, expect, it } from "vitest";
import { testCue } from "../test/fixtures/cues";
import {
  buildTtsGeneratedKey,
  getTtsCueWarning,
  getTtsGeneratedKey,
  isTtsGenerationStale,
  resolveTtsLang,
  resolveTtsVoice,
  ttsAssetPath,
} from "./tts";

describe("tts helpers", () => {
  it("builds stable generated keys including engine and lang", () => {
    expect(buildTtsGeneratedKey(" Hello ", "af_heart", 1, "en", "kokoro")).toBe(
      "kokoro|en|af_heart|1|Hello",
    );
    expect(buildTtsGeneratedKey("Hallo", "M1", 1.05, "de", "supertonic")).toBe(
      "supertonic|de|M1|1.05|Hallo",
    );
  });

  it("resolves platform voices and languages", () => {
    expect(resolveTtsVoice("af_heart", "kokoro")).toBe("af_heart");
    expect(resolveTtsVoice("M1", "kokoro")).toBe("af_heart");
    expect(resolveTtsVoice(undefined, "kokoro")).toBe("af_heart");
    expect(resolveTtsVoice("af_heart", "supertonic")).toBe("M1");
    expect(resolveTtsVoice("F2", "supertonic")).toBe("F2");
    expect(resolveTtsVoice(undefined, "supertonic")).toBe("M1");
    expect(resolveTtsLang("de", "supertonic")).toBe("de");
    expect(resolveTtsLang("zz", "supertonic")).toBe("en");
    expect(resolveTtsLang("de", "kokoro")).toBe("en");
    expect(resolveTtsLang(undefined, "kokoro")).toBe("en");
  });

  it("detects stale generation when text changes", () => {
    const cue = testCue("s1", "Speech", "tts", {
      ttsText: "Hello",
      ttsVoice: "af_heart",
      ttsLang: "en",
      ttsSpeed: 1,
      assetPath: ttsAssetPath("s1"),
      ttsGeneratedKey: buildTtsGeneratedKey("Hello", "af_heart", 1, "en", "kokoro"),
    });
    expect(isTtsGenerationStale(cue, "kokoro")).toBe(false);
    expect(isTtsGenerationStale({ ...cue, ttsText: "Goodbye" }, "kokoro")).toBe(true);
  });

  it("marks cues stale when the other engine would regenerate them", () => {
    const kokoroCue = testCue("s1", "Speech", "tts", {
      ttsText: "Hello",
      ttsVoice: "af_heart",
      ttsLang: "en",
      ttsSpeed: 1,
      assetPath: ttsAssetPath("s1"),
      ttsGeneratedKey: buildTtsGeneratedKey("Hello", "af_heart", 1, "en", "kokoro"),
    });
    expect(isTtsGenerationStale(kokoroCue, "kokoro")).toBe(false);
    expect(isTtsGenerationStale(kokoroCue, "supertonic")).toBe(true);

    const desktopCue = testCue("s2", "Speech", "tts", {
      ttsText: "Hallo",
      ttsVoice: "M1",
      ttsLang: "de",
      ttsSpeed: 1,
      assetPath: ttsAssetPath("s2"),
      ttsGeneratedKey: buildTtsGeneratedKey("Hallo", "M1", 1, "de", "supertonic"),
    });
    expect(isTtsGenerationStale(desktopCue, "supertonic")).toBe(false);
    expect(isTtsGenerationStale(desktopCue, "kokoro")).toBe(true);
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
      ttsLang: "en",
      ttsSpeed: 1,
      assetPath: ttsAssetPath("s3"),
      ttsGeneratedKey: getTtsGeneratedKey(
        {
          ...testCue("s3", "Speech", "tts"),
          ttsText: "Line",
          ttsVoice: "af_heart",
          ttsLang: "en",
          ttsSpeed: 1,
        },
        "kokoro",
      ),
    });
    expect(getTtsCueWarning(ready)).toBeNull();
  });
});
