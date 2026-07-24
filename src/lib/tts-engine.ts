import { getPlatform } from "../platform";
import {
  generateSpeechWav as generateKokoroSpeechWav,
  getLoadedKokoroDevice,
  type SpeechGeneratePhase,
} from "./kokoro-engine";
import { DEFAULT_TTS_SPEED, getTtsEngine, resolveTtsLang, resolveTtsVoice } from "./tts";

export type { SpeechGeneratePhase };

export interface GenerateSpeechOptions {
  text: string;
  voice: string;
  speed?: number;
  lang?: string;
  onPhase?: (phase: SpeechGeneratePhase) => void;
}

function bytesToWavBlob(data: ArrayBuffer | Uint8Array | number[]): Blob {
  const bytes =
    data instanceof Uint8Array
      ? data
      : data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data);
  // Copy into a fresh ArrayBuffer — `Blob` rejects SharedArrayBuffer views.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: "audio/wav" });
}

async function generateSupertonicSpeechWav(options: GenerateSpeechOptions): Promise<Blob> {
  const { invoke } = await import("@tauri-apps/api/core");
  const engine = getTtsEngine();
  const voice = resolveTtsVoice(options.voice, engine);
  const lang = resolveTtsLang(options.lang, engine);
  const speed = options.speed ?? DEFAULT_TTS_SPEED;

  options.onPhase?.("loading-model");
  await invoke("supertonic_load");

  options.onPhase?.("synthesizing");
  const wav = await invoke<ArrayBuffer | Uint8Array | number[]>("tts_synthesize", {
    text: options.text,
    lang,
    voice,
    speed,
  });
  return bytesToWavBlob(wav);
}

/** Platform TTS entry point: Kokoro on web, Supertonic on desktop. */
export async function generateSpeechWav(options: GenerateSpeechOptions): Promise<Blob> {
  if (getPlatform() === "tauri") {
    return generateSupertonicSpeechWav(options);
  }
  return generateKokoroSpeechWav({
    text: options.text,
    voice: resolveTtsVoice(options.voice, "kokoro"),
    speed: options.speed,
    onPhase: options.onPhase,
  });
}

export function getActiveSpeechBackendLabel(): "supertonic" | "webgpu" | "wasm" | null {
  if (getPlatform() === "tauri") return "supertonic";
  return getLoadedKokoroDevice();
}
