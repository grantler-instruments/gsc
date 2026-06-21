import { describe, expect, it } from "vitest";
import { resolveKokoroDevice, resolveKokoroDtypeCandidates } from "./kokoro-engine";

describe("resolveKokoroDevice", () => {
  it("uses wasm on Tauri (WebGPU ONNX hangs in WKWebView)", () => {
    expect(resolveKokoroDevice("tauri", true)).toBe("wasm");
    expect(resolveKokoroDevice("tauri", false)).toBe("wasm");
  });

  it("prefers webgpu in the browser when available", () => {
    expect(resolveKokoroDevice("web", true)).toBe("webgpu");
    expect(resolveKokoroDevice("web", false)).toBe("wasm");
  });
});

describe("resolveKokoroDtypeCandidates", () => {
  it("prefers q8 on Tauri with fp32 fallback for older caches", () => {
    expect(resolveKokoroDtypeCandidates("tauri", "wasm")).toEqual(["q8", "fp32"]);
  });

  it("keeps web defaults", () => {
    expect(resolveKokoroDtypeCandidates("web", "webgpu")).toEqual(["fp32"]);
    expect(resolveKokoroDtypeCandidates("web", "wasm")).toEqual(["q8"]);
  });
});
