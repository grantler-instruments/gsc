import { getPlatform } from "../platform";
import { usePreferencesStore } from "../stores/preferences";
import { SPEECH_MODEL_CACHE_NAMES } from "./speech-model-fs-cache";

let cacheInstalled = false;

export async function ensureSpeechModelCache(): Promise<void> {
  if (cacheInstalled) return;

  if (getPlatform() === "tauri") {
    const { installTauriSpeechModelCache } = await import("../platform/speech-model-cache.tauri");
    await installTauriSpeechModelCache();
  }

  cacheInstalled = true;
}

export async function configureSpeechModelTransformersCache(env: {
  useBrowserCache?: boolean;
  useCustomCache?: boolean;
  customCache?: import("./speech-model-fs-cache").SpeechModelFsCache;
}): Promise<void> {
  if (getPlatform() !== "tauri") return;

  const { configureTransformersCustomCache } = await import("../platform/speech-model-cache.tauri");
  await configureTransformersCustomCache(env);
}

export async function syncSpeechModelReadyFromDisk(
  setSpeechModelReady: (ready: boolean) => void,
): Promise<boolean> {
  if (getPlatform() !== "tauri") return getPreferencesSpeechModelReady();

  const { isSpeechModelInstalledOnDisk } = await import("../platform/speech-model-cache.tauri");
  const installed = await isSpeechModelInstalledOnDisk();
  setSpeechModelReady(installed);
  return installed;
}

export async function markSpeechModelInstalled(): Promise<void> {
  if (getPlatform() === "tauri") {
    const { markSpeechModelInstalledOnDisk } = await import("../platform/speech-model-cache.tauri");
    await markSpeechModelInstalledOnDisk();
  }
}

export async function isSpeechModelInstalled(): Promise<boolean> {
  if (getPlatform() === "tauri") {
    const { isSpeechModelInstalledOnDisk } = await import("../platform/speech-model-cache.tauri");
    return isSpeechModelInstalledOnDisk();
  }
  return getPreferencesSpeechModelReady();
}

function getPreferencesSpeechModelReady(): boolean {
  return usePreferencesStore.getState().speechModelReady;
}

export async function clearSpeechModelCache(): Promise<void> {
  if (getPlatform() === "tauri") {
    const { clearTauriSpeechModelCache } = await import("../platform/speech-model-cache.tauri");
    await clearTauriSpeechModelCache();
    return;
  }

  if (typeof caches === "undefined") return;

  await Promise.all(
    SPEECH_MODEL_CACHE_NAMES.map(async (name) => {
      try {
        await caches.delete(name);
      } catch {
        /* ignore */
      }
    }),
  );
}
