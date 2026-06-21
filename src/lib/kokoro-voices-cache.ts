import { getPlatform } from "../platform";
import { ensureSpeechModelCache } from "./speech-model-cache";
import { KOKORO_MODEL_ID, TTS_VOICE_OPTIONS } from "./tts";

const VOICE_REMOTE_BASE = `https://huggingface.co/${KOKORO_MODEL_ID}/resolve/main/voices`;

export function kokoroVoiceCacheUrl(voiceId: string): string {
  return `${VOICE_REMOTE_BASE}/${voiceId}.bin`;
}

export function bundledVoiceUrl(voiceId: string): string {
  const relative = `${import.meta.env.BASE_URL.replace(/\/?$/, "/")}kokoro/voices/${voiceId}.bin`;
  if (typeof window !== "undefined") {
    return new URL(relative, window.location.href).href;
  }
  return relative;
}

async function loadBundledVoiceBytes(voiceId: string): Promise<ArrayBuffer> {
  const url = bundledVoiceUrl(voiceId);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Bundled Kokoro voice missing: ${voiceId} (${response.status} ${url})`);
  }
  return response.arrayBuffer();
}

/** Kokoro loads voice style vectors lazily via Cache API — seed from bundled files (no HF fetch at generate time). */
export async function seedKokoroVoicesCache(
  voiceIds: readonly string[] = TTS_VOICE_OPTIONS,
): Promise<void> {
  await ensureSpeechModelCache();
  if (typeof caches === "undefined") return;

  const cache = await caches.open("kokoro-voices");

  await Promise.all(
    voiceIds.map(async (voiceId) => {
      const cacheUrl = kokoroVoiceCacheUrl(voiceId);
      if (await cache.match(cacheUrl)) return;

      const body = await loadBundledVoiceBytes(voiceId);
      await cache.put(
        cacheUrl,
        new Response(body, {
          headers: { "Content-Type": "application/octet-stream" },
        }),
      );
    }),
  );
}

export async function warmUpKokoroPhonemizer(): Promise<void> {
  const { phonemize } = await import("phonemizer");
  await phonemize("ok", "en-us");
}

/** True when voices are present in the kokoro-voices cache (used for UI diagnostics). */
export async function isKokoroVoiceCacheReady(voiceId = "af_heart"): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    await ensureSpeechModelCache();
    const cache = await caches.open("kokoro-voices");
    return (await cache.match(kokoroVoiceCacheUrl(voiceId))) !== undefined;
  } catch {
    return false;
  }
}

export function describeKokoroRuntime(platform = getPlatform()): string {
  return platform === "tauri" ? "wasm (desktop)" : "webgpu or wasm";
}
