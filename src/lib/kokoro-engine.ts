import type { KokoroTTS } from "kokoro-js";
import { getPlatform, type PlatformKind } from "../platform";
import { seedKokoroVoicesCache, warmUpKokoroPhonemizer } from "./kokoro-voices-cache";
import { formatAppError } from "./notifications";
import { configureOnnxWasmForPlatform } from "./onnx-wasm-config";
import { withTimeout } from "./promise-timeout";
import {
  configureSpeechModelTransformersCache,
  ensureSpeechModelCache,
} from "./speech-model-cache";
import { KOKORO_MODEL_ID } from "./tts";

export type SpeechModelLoadProgress = {
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
  status?: string;
};

export type KokoroModelDtype = "fp32" | "q8";
export type KokoroInferenceDevice = "webgpu" | "wasm";

/** q8 loads faster on desktop; fall back to fp32 when an older fp32-only cache exists. */
export function resolveKokoroDtypeCandidates(
  platform: PlatformKind,
  device: KokoroInferenceDevice,
): KokoroModelDtype[] {
  if (platform === "tauri") {
    return ["q8", "fp32"];
  }
  return [device === "webgpu" ? "fp32" : "q8"];
}

/** Begin loading heavy JS deps while the user is still downloading model files. */
export function preloadKokoroRuntimeModules(): void {
  void import("@huggingface/transformers");
  void import("kokoro-js");
  void import("phonemizer");
  void seedKokoroVoicesCache().catch((err) => {
    console.warn("[kokoro] early voice cache seed failed:", err);
  });
}

const WARMUP_TIMEOUT_MS = 30_000;
const LOAD_TIMEOUT_MS = 180_000;
const GENERATE_TIMEOUT_MS = 120_000;
const PHONEMIZER_TIMEOUT_MS = 20_000;

let runtimeSpeechReady = false;
let runtimeSpeechWarmPromise: Promise<void> | null = null;

/** Seed bundled voices + espeak phonemizer (no inference — avoids WebGPU hangs on desktop). */
export async function ensureKokoroRuntimeWarm(): Promise<void> {
  if (runtimeSpeechReady) return;
  if (runtimeSpeechWarmPromise) return runtimeSpeechWarmPromise;

  runtimeSpeechWarmPromise = withTimeout(
    (async () => {
      await seedKokoroVoicesCache();
      try {
        await withTimeout(warmUpKokoroPhonemizer(), PHONEMIZER_TIMEOUT_MS, "Phonemizer init");
      } catch (err) {
        console.warn("[kokoro] phonemizer warmup skipped:", err);
      }
      runtimeSpeechReady = true;
    })(),
    WARMUP_TIMEOUT_MS,
    "Speech runtime warmup",
  ).finally(() => {
    runtimeSpeechWarmPromise = null;
  });

  return runtimeSpeechWarmPromise;
}

let ttsInstance: KokoroTTS | null = null;
let loadPromise: Promise<KokoroTTS> | null = null;
let runtimeConfigured = false;
let loadedDevice: KokoroInferenceDevice | null = null;

/** WebGPU ONNX inference hangs in Tauri WKWebView — use WASM+q8 on desktop. */
export function resolveKokoroDevice(
  platform: PlatformKind,
  webGpuAvailable: boolean,
): KokoroInferenceDevice {
  if (platform === "tauri") return "wasm";
  return webGpuAvailable ? "webgpu" : "wasm";
}

export function getLoadedKokoroDevice(): KokoroInferenceDevice | null {
  return loadedDevice;
}

async function detectWebGpuAvailable(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return adapter != null;
  } catch {
    return false;
  }
}

async function pickInferenceDevice(): Promise<KokoroInferenceDevice> {
  const webGpuAvailable = await detectWebGpuAvailable();
  return resolveKokoroDevice(getPlatform(), webGpuAvailable);
}

async function configureTransformersRuntime(
  platform: PlatformKind,
  device: KokoroInferenceDevice,
): Promise<void> {
  if (runtimeConfigured) return;

  await ensureSpeechModelCache();

  const { env } = await import("@huggingface/transformers");
  await configureSpeechModelTransformersCache(env);
  if (device === "wasm" || platform === "tauri") {
    configureOnnxWasmForPlatform(env, platform);
  }

  runtimeConfigured = true;
}

export type LoadKokoroOptions = {
  /** When false, only load files already on disk (no Hugging Face fetch). */
  allowRemoteModels?: boolean;
};

async function createKokoroInstance(
  onProgress?: (progress: SpeechModelLoadProgress) => void,
  options?: LoadKokoroOptions,
): Promise<KokoroTTS> {
  const platform = getPlatform();
  const device = await pickInferenceDevice();
  await configureTransformersRuntime(platform, device);

  const { env } = await import("@huggingface/transformers");
  const { KokoroTTS } = await import("kokoro-js");

  const previousAllowRemote = env.allowRemoteModels;
  const previousAllowLocal = env.allowLocalModels;
  if (options?.allowRemoteModels === false) {
    env.allowRemoteModels = false;
    // In browser/Tauri, allowLocalModels defaults to false — enable it for cache-only loads.
    env.allowLocalModels = true;
  }

  try {
    const dtypeCandidates = resolveKokoroDtypeCandidates(platform, device);
    let lastError: unknown;

    for (const dtype of dtypeCandidates) {
      try {
        const instance = await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
          dtype,
          device,
          progress_callback: (progress) => {
            const info = progress as SpeechModelLoadProgress & { status?: string };
            if (info.loaded !== undefined || info.file || info.status) {
              onProgress?.({
                file: info.file,
                progress: info.progress,
                loaded: info.loaded,
                total: info.total,
                status: info.status,
              });
            }
          },
        });

        loadedDevice = device;
        try {
          await ensureKokoroRuntimeWarm();
        } catch (warmErr) {
          console.warn("[kokoro] speech runtime warmup failed:", warmErr);
        }
        return instance;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError;
  } finally {
    env.allowRemoteModels = previousAllowRemote;
    if (platform === "tauri") {
      env.allowLocalModels = true;
    } else {
      env.allowLocalModels = previousAllowLocal;
    }
  }
}

export function getLoadedKokoroTts(): KokoroTTS | null {
  return ttsInstance;
}

export async function loadKokoroTts(
  onProgress?: (progress: SpeechModelLoadProgress) => void,
  options?: LoadKokoroOptions,
): Promise<KokoroTTS> {
  if (ttsInstance) return ttsInstance;
  if (loadPromise) return loadPromise;

  loadPromise = withTimeout(
    createKokoroInstance(onProgress, options).then((instance) => {
      ttsInstance = instance;
      return instance;
    }),
    LOAD_TIMEOUT_MS,
    "Loading speech model",
  ).finally(() => {
    loadPromise = null;
  });

  return loadPromise;
}

export interface GenerateSpeechOptions {
  text: string;
  voice: string;
  speed?: number;
}

export async function generateSpeechWav(options: GenerateSpeechOptions): Promise<Blob> {
  const platform = getPlatform();
  const device = getLoadedKokoroDevice() ?? (await pickInferenceDevice());
  try {
    const tts = await loadKokoroTts(undefined, { allowRemoteModels: false });
    await ensureKokoroRuntimeWarm();
    const audio = await withTimeout(
      tts.generate(options.text, {
        voice: options.voice,
        speed: options.speed ?? 1,
      } as NonNullable<Parameters<KokoroTTS["generate"]>[1]>),
      GENERATE_TIMEOUT_MS,
      "Speech synthesis",
    );
    return audio.toBlob();
  } catch (err) {
    const detail = formatAppError(err);
    throw new Error(
      platform === "tauri"
        ? `Speech generation failed (desktop WASM/CPU — first run can take up to 2 min): ${detail}`
        : device === "wasm"
          ? `Speech generation failed (CPU/WASM): ${detail}`
          : `Speech generation failed (${device}): ${detail}`,
    );
  }
}

/** Release the in-memory model (e.g. if user clears downloaded model). */
export function unloadKokoroTts(): void {
  ttsInstance = null;
  loadPromise = null;
  loadedDevice = null;
  runtimeConfigured = false;
  runtimeSpeechReady = false;
  runtimeSpeechWarmPromise = null;
}
