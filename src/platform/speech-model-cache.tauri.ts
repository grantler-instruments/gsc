import { invoke } from "@tauri-apps/api/core";
import {
  isSpeechModelCacheName,
  type SpeechModelCacheStorage,
  SpeechModelFsCache,
  speechModelCacheHasBodyFiles,
} from "../lib/speech-model-fs-cache";

const INSTALL_MARKER = ".installed";
const TRANSFORMERS_CACHE_NAME = "transformers-cache";

function bytesFromInvoke(data: ArrayBuffer | Uint8Array | number[]): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data);
}

const bodyReadCache = new Map<string, Uint8Array>();

/** Rust-backed storage — pass Uint8Array directly (never Array.from on large model files). */
const tauriStorage: SpeechModelCacheStorage = {
  exists: (relativePath) => invoke<boolean>("speech_model_cache_exists", { relativePath }),
  readBytes: async (relativePath) => {
    const cached = bodyReadCache.get(relativePath);
    if (cached) return cached;

    const data = await invoke<ArrayBuffer | Uint8Array | number[]>("speech_model_cache_read", {
      relativePath,
    });
    const bytes = bytesFromInvoke(data);
    bodyReadCache.set(relativePath, bytes);
    return bytes;
  },
  readText: async (relativePath) => {
    const bytes = await tauriStorage.readBytes(relativePath);
    return new TextDecoder().decode(bytes);
  },
  writeBytes: (relativePath, data) => {
    bodyReadCache.delete(relativePath);
    return invoke("speech_model_cache_write", { relativePath, data });
  },
  appendBytes: (relativePath, data) => {
    bodyReadCache.delete(relativePath);
    return invoke("speech_model_cache_append", { relativePath, data });
  },
  writeText: (relativePath, data) =>
    invoke("speech_model_cache_write", {
      relativePath,
      data: new TextEncoder().encode(data),
    }),
  ensureDir: (relativePath) => invoke("speech_model_cache_mkdir", { relativePath }),
  removeDir: () => invoke("speech_model_cache_remove_all"),
  resolveAbsolutePath: async (relativePath) => {
    try {
      return await invoke<string>("speech_model_cache_resolve_path", { relativePath });
    } catch {
      return null;
    }
  },
};

const cacheInstances = new Map<string, SpeechModelFsCache>();
let cachesOpenInstalled = false;

async function getOrCreateCache(name: string): Promise<SpeechModelFsCache> {
  const existing = cacheInstances.get(name);
  if (existing) return existing;

  await tauriStorage.ensureDir(name);
  const cache = new SpeechModelFsCache(name, tauriStorage);
  cacheInstances.set(name, cache);
  return cache;
}

/** Route Kokoro/transformers cache reads and writes to app cache via Rust (WKWebView Cache API is not durable). */
export async function installTauriSpeechModelCache(): Promise<void> {
  if (cachesOpenInstalled || typeof caches === "undefined") return;

  const originalOpen = caches.open.bind(caches);
  caches.open = async (name: string) => {
    if (isSpeechModelCacheName(name)) {
      return (await getOrCreateCache(name)) as unknown as Cache;
    }
    return originalOpen(name);
  };

  cachesOpenInstalled = true;
}

type TransformersEnv = {
  useBrowserCache?: boolean;
  useCustomCache?: boolean;
  customCache?: SpeechModelFsCache;
  allowLocalModels?: boolean;
};

/** Wire transformers.js directly to the on-disk cache (more reliable than Cache API alone). */
export async function configureTransformersCustomCache(env: TransformersEnv): Promise<void> {
  env.useBrowserCache = false;
  env.useCustomCache = true;
  env.customCache = await getOrCreateCache(TRANSFORMERS_CACHE_NAME);
  // Browser env defaults allowLocalModels=false; custom disk cache requires local access.
  env.allowLocalModels = true;
}

export async function markSpeechModelInstalledOnDisk(): Promise<void> {
  await tauriStorage.writeText(INSTALL_MARKER, new Date().toISOString());
}

export async function isSpeechModelInstalledOnDisk(): Promise<boolean> {
  try {
    if (!(await tauriStorage.exists(INSTALL_MARKER))) return false;

    const names = await invoke<string[]>("speech_model_cache_list_dir", {
      relativePath: TRANSFORMERS_CACHE_NAME,
    });
    return speechModelCacheHasBodyFiles(names.map((name) => ({ name })));
  } catch {
    return false;
  }
}

export async function clearTauriSpeechModelCache(): Promise<void> {
  cacheInstances.clear();
  bodyReadCache.clear();
  await invoke("speech_model_cache_remove_all");
}
