import { describe, expect, it } from "vitest";
import { kokoroPhonemeLocale, kokoroVoiceCacheUrl } from "./kokoro-voices-cache";

describe("kokoro-voices-cache", () => {
  it("uses the same cache URL shape as kokoro-js", () => {
    expect(kokoroVoiceCacheUrl("af_heart")).toBe(
      "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/af_heart.bin",
    );
  });

  it("maps voice ids to espeak locales like kokoro-js", () => {
    expect(kokoroPhonemeLocale("af_heart")).toBe("en-us");
    expect(kokoroPhonemeLocale("bf_emma")).toBe("en");
  });
});
