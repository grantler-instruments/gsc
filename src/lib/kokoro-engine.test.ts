import { describe, expect, it } from "vitest";
import {
  getGenerateTimeoutMs,
  isGenerationTimeoutError,
  resolveKokoroDevice,
  resolveKokoroDtypeCandidates,
} from "./kokoro-engine";

describe("resolveKokoroDevice", () => {
  it("prefers webgpu on Tauri when available (with wasm fallback on failure)", () => {
    expect(resolveKokoroDevice("tauri", true)).toBe("webgpu");
    expect(resolveKokoroDevice("tauri", false)).toBe("wasm");
  });

  it("prefers webgpu in the browser when available", () => {
    expect(resolveKokoroDevice("web", true)).toBe("webgpu");
    expect(resolveKokoroDevice("web", false)).toBe("wasm");
  });
});

describe("resolveKokoroDtypeCandidates", () => {
  it("uses fp32 for webgpu", () => {
    expect(resolveKokoroDtypeCandidates("tauri", "webgpu")).toEqual(["fp32"]);
    expect(resolveKokoroDtypeCandidates("web", "webgpu")).toEqual(["fp32"]);
  });

  it("uses q8 with fp32 fallback for wasm", () => {
    expect(resolveKokoroDtypeCandidates("tauri", "wasm")).toEqual(["q8", "fp32"]);
    expect(resolveKokoroDtypeCandidates("web", "wasm")).toEqual(["q8", "fp32"]);
  });
});

describe("generate timeouts", () => {
  it("uses shorter timeout for webgpu than wasm", () => {
    expect(getGenerateTimeoutMs("webgpu")).toBeLessThan(getGenerateTimeoutMs("wasm"));
  });

  it("detects timeout errors", () => {
    expect(
      isGenerationTimeoutError(new Error("Speech synthesis (webgpu) timed out after 60s")),
    ).toBe(true);
    expect(isGenerationTimeoutError(new Error("other"))).toBe(false);
  });
});
