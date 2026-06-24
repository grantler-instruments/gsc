import type { KokoroTTS } from "kokoro-js";
import { getPlatform, type PlatformKind } from "../platform";
import {
  assertVoiceCached,
  seedKokoroVoicesCache,
  warmUpKokoroPhonemizer,
} from "./kokoro-voices-cache";
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

export type SpeechGeneratePhase = "loading-model" | "synthesizing" | "fallback-wasm";

/** q8 for WASM; fp32 for WebGPU (same as browser). */
export function resolveKokoroDtypeCandidates(
  _platform: PlatformKind,
  device: KokoroInferenceDevice,
): KokoroModelDtype[] {
  if (device === "webgpu") return ["fp32"];
  return ["q8", "fp32"];
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
const WEBGPU_GENERATE_TIMEOUT_MS = 60_000;
const WASM_GENERATE_TIMEOUT_MS = 300_000;
const PHONEMIZER_TIMEOUT_MS = 20_000;

let runtimeSpeechReady = false;
let runtimeSpeechWarmPromise: Promise<void> | null = null;

/** Seed bundled voices + espeak phonemizer (no inference). */
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
let loadedDevice: KokoroInferenceDevice | null = null;

/** Prefer WebGPU when available; Tauri falls back to WASM on load or generate failure. */
export function resolveKokoroDevice(
  platform: PlatformKind,
  webGpuAvailable: boolean,
): KokoroInferenceDevice {
  if (platform === "tauri") {
    return webGpuAvailable ? "webgpu" : "wasm";
  }
  return webGpuAvailable ? "webgpu" : "wasm";
}

export function getGenerateTimeoutMs(device: KokoroInferenceDevice): number {
  return device === "webgpu" ? WEBGPU_GENERATE_TIMEOUT_MS : WASM_GENERATE_TIMEOUT_MS;
}

export function isGenerationTimeoutError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("timed out");
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
  await ensureSpeechModelCache();

  const { env } = await import("@huggingface/transformers");
  await configureSpeechModelTransformersCache(env);
  if (device === "wasm") {
    configureOnnxWasmForPlatform(env, platform);
  }
}

function deviceCandidates(
  platform: PlatformKind,
  webGpuAvailable: boolean,
): KokoroInferenceDevice[] {
  if (platform === "tauri") {
    return webGpuAvailable ? ["webgpu", "wasm"] : ["wasm"];
  }
  return [resolveKokoroDevice(platform, webGpuAvailable)];
}

async function loadKokoroForDevice(
  platform: PlatformKind,
  device: KokoroInferenceDevice,
  onProgress?: (progress: SpeechModelLoadProgress) => void,
  options?: LoadKokoroOptions,
): Promise<KokoroTTS> {
  await configureTransformersRuntime(platform, device);

  const { env } = await import("@huggingface/transformers");
  const { KokoroTTS } = await import("kokoro-js");

  const previousAllowRemote = env.allowRemoteModels;
  const previousAllowLocal = env.allowLocalModels;
  if (options?.allowRemoteModels === false) {
    env.allowRemoteModels = false;
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

export type LoadKokoroOptions = {
  /** When false, only load files already on disk (no Hugging Face fetch). */
  allowRemoteModels?: boolean;
  /** Load a specific backend (used when falling back from WebGPU to WASM). */
  device?: KokoroInferenceDevice;
};

async function createKokoroInstance(
  onProgress?: (progress: SpeechModelLoadProgress) => void,
  options?: LoadKokoroOptions,
): Promise<KokoroTTS> {
  const platform = getPlatform();
  const webGpuAvailable = await detectWebGpuAvailable();
  const devices = options?.device ? [options.device] : deviceCandidates(platform, webGpuAvailable);
  let lastError: unknown;

  for (const device of devices) {
    try {
      return await loadKokoroForDevice(platform, device, onProgress, options);
    } catch (err) {
      lastError = err;
      console.warn(`[kokoro] failed to load on ${device}, trying next backend`, err);
      if (options?.device) break;
    }
  }

  throw lastError;
}

export function getLoadedKokoroTts(): KokoroTTS | null {
  return ttsInstance;
}

export async function loadKokoroTts(
  onProgress?: (progress: SpeechModelLoadProgress) => void,
  options?: LoadKokoroOptions,
): Promise<KokoroTTS> {
  const forcedDevice = options?.device;
  if (ttsInstance) {
    if (!forcedDevice || loadedDevice === forcedDevice) return ttsInstance;
    unloadKokoroTts();
  }
  if (loadPromise && forcedDevice) {
    unloadKokoroTts();
  }
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
  onPhase?: (phase: SpeechGeneratePhase) => void;
}

async function synthesizeSpeech(
  tts: KokoroTTS,
  options: GenerateSpeechOptions,
  device: KokoroInferenceDevice,
) {
  return withTimeout(
    tts.generate(options.text, {
      voice: options.voice,
      speed: options.speed ?? 1,
    } as NonNullable<Parameters<KokoroTTS["generate"]>[1]>),
    getGenerateTimeoutMs(device),
    `Speech synthesis (${device})`,
  );
}

export async function generateSpeechWav(options: GenerateSpeechOptions): Promise<Blob> {
  const platform = getPlatform();

  options.onPhase?.("loading-model");
  let tts = await loadKokoroTts(undefined, { allowRemoteModels: false });
  let device = getLoadedKokoroDevice() ?? (await pickInferenceDevice());

  try {
    await ensureKokoroRuntimeWarm();
    await assertVoiceCached(options.voice);

    options.onPhase?.("synthesizing");
    try {
      const audio = await synthesizeSpeech(tts, options, device);
      return audio.toBlob();
    } catch (generateErr) {
      const canFallback =
        platform === "tauri" && device === "webgpu" && isGenerationTimeoutError(generateErr);

      if (!canFallback) throw generateErr;

      console.warn("[kokoro] WebGPU synthesis timed out, retrying on WASM");
      options.onPhase?.("fallback-wasm");
      unloadKokoroTts();
      tts = await loadKokoroTts(undefined, { allowRemoteModels: false, device: "wasm" });
      device = "wasm";

      options.onPhase?.("synthesizing");
      const audio = await synthesizeSpeech(tts, options, device);
      return audio.toBlob();
    }
  } catch (err) {
    const detail = formatAppError(err);
    throw new Error(
      platform === "tauri"
        ? `Speech generation failed (desktop): ${detail}`
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
  runtimeSpeechReady = false;
  runtimeSpeechWarmPromise = null;
}
