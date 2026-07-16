import type { PlatformKind } from "../platform";

/** Keep in sync with @huggingface/transformers in package.json. */
const TRANSFORMERS_VERSION = "3.8.1";

export type OnnxWasmEnv = {
  proxy?: boolean;
  numThreads?: number;
  wasmPaths?: unknown;
};

export function getTransformersOnnxWasmCdnBase(): string {
  return `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}/dist/`;
}

export function getLocalOnnxWasmBase(): string {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
  if (typeof window !== "undefined") {
    return new URL(`${base}ort/`, window.location.href).href;
  }
  return `${base}ort/`;
}

type TransformersEnv = {
  backends?: {
    onnx?: {
      wasm?: OnnxWasmEnv;
    };
  };
};

export function getOnnxWasmSettings(env: TransformersEnv): OnnxWasmEnv | undefined {
  const onnx = env.backends?.onnx;
  if (!onnx) return undefined;
  if (!onnx.wasm) {
    onnx.wasm = {};
  }
  return onnx.wasm;
}

/**
 * Tauri/WKWebView: disable ONNX proxy workers (they hang). Load ort WASM from the
 * Hugging Face CDN — bundled /public paths break Vite module loading in dev.
 */
export function configureOnnxWasmForPlatform(env: TransformersEnv, platform: PlatformKind): void {
  if (platform !== "tauri") return;

  const onnxWasm = getOnnxWasmSettings(env);
  if (!onnxWasm) return;

  onnxWasm.proxy = false;
  // WKWebView is not cross-origin isolated — multi-threaded ORT WASM can hang indefinitely.
  onnxWasm.numThreads = 1;
  onnxWasm.wasmPaths = getLocalOnnxWasmBase();
}
