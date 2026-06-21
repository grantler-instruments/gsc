import { describe, expect, it } from "vitest";
import { kokoroVoiceCacheUrl } from "./kokoro-voices-cache";

describe("kokoro-voices-cache", () => {
  it("uses the same cache URL shape as kokoro-js", () => {
    expect(kokoroVoiceCacheUrl("af_heart")).toBe(
      "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/af_heart.bin",
    );
  });
});
