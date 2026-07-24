import { getPlatform } from "../platform";
import { formatAppError } from "./notifications";
import { withTimeout } from "./promise-timeout";
import { ensureSpeechModelCache } from "./speech-model-cache";
import { KOKORO_MODEL_ID, TTS_VOICE_OPTIONS } from "./tts";

const VOICE_FETCH_TIMEOUT_MS = 15_000;

const VOICE_REMOTE_BASE = `https://huggingface.co/${KOKORO_MODEL_ID}/resolve/main/voices`;

export function kokoroVoiceCacheUrl(voiceId: string): string {
  return `${VOICE_REMOTE_BASE}/${voiceId}.bin`;
}

function bundledVoiceCandidates(voiceId: string): string[] {
  const file = `kokoro/voices/${voiceId}.bin`;
  const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
  const paths = new Set<string>([`${base}${file}`, `/kokoro/voices/${voiceId}.bin`]);
  if (typeof window !== "undefined") {
    return [...paths].map((rel) => new URL(rel, window.location.href).href);
  }
  return [...paths];
}

async function loadBundledVoiceBytes(voiceId: string): Promise<ArrayBuffer> {
  const errors: string[] = [];
  for (const url of bundledVoiceCandidates(voiceId)) {
    try {
      const response = await withTimeout(
        fetch(url),
        VOICE_FETCH_TIMEOUT_MS,
        `Loading voice ${voiceId}`,
      );
      if (response.ok) return response.arrayBuffer();
      errors.push(`${url}: HTTP ${response.status}`);
    } catch (err) {
      errors.push(`${url}: ${formatAppError(err)}`);
    }
  }
  throw new Error(`Bundled Kokoro voice missing: ${voiceId} (${errors.join("; ")})`);
}

export async function loadBundledVoiceBytesForVoice(voiceId: string): Promise<ArrayBuffer> {
  return loadBundledVoiceBytes(voiceId);
}

export async function assertVoiceCached(voiceId: string): Promise<void> {
  await seedKokoroVoicesCache([voiceId]);
  if (!(await isKokoroVoiceCacheReady(voiceId))) {
    throw new Error(
      `Voice "${voiceId}" is not available offline. Restart the app or reinstall speech files in Settings.`,
    );
  }
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

/** Kokoro voice ids start with `a` (US) or `b` (GB) — matches kokoro-js locale selection. */
export function kokoroPhonemeLocale(voiceId: string): string {
  return voiceId.at(0) === "a" ? "en-us" : "en";
}

export async function phonemizeForKokoroVoice(text: string, voiceId: string): Promise<void> {
  const { phonemize } = await import("phonemizer");
  await phonemize(text, kokoroPhonemeLocale(voiceId));
}

export async function warmUpKokoroPhonemizer(): Promise<void> {
  await phonemizeForKokoroVoice("ok", "af_heart");
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
  return platform === "tauri" ? "webgpu with wasm fallback (desktop)" : "webgpu or wasm";
}
