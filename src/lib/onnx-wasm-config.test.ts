import { describe, expect, it } from "vitest";
import {
  configureOnnxWasmForPlatform,
  getLocalOnnxWasmBase,
  getOnnxWasmSettings,
  getTransformersOnnxWasmCdnBase,
} from "./onnx-wasm-config";

describe("onnx-wasm-config", () => {
  it("uses the transformers CDN for ort wasm", () => {
    expect(getTransformersOnnxWasmCdnBase()).toBe(
      "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/",
    );
  });

  it("creates onnx wasm settings when missing", () => {
    const env: { backends: { onnx: { wasm?: { proxy?: boolean } } } } = { backends: { onnx: {} } };
    expect(getOnnxWasmSettings(env)).toBe(env.backends.onnx.wasm);
  });

  it("disables proxy workers and pins CDN wasm on Tauri", () => {
    const env = {
      backends: { onnx: { wasm: { proxy: true, numThreads: 4, wasmPaths: "/ort/" } } },
    };
    configureOnnxWasmForPlatform(env, "tauri");
    expect(env.backends.onnx.wasm).toEqual({
      proxy: false,
      numThreads: 1,
      wasmPaths: getLocalOnnxWasmBase(),
    });
  });

  it("leaves web defaults untouched", () => {
    const env = {
      backends: { onnx: { wasm: { proxy: true, numThreads: 4, wasmPaths: "/ort/" } } },
    };
    configureOnnxWasmForPlatform(env, "web");
    expect(env.backends.onnx.wasm?.wasmPaths).toBe("/ort/");
  });
});
