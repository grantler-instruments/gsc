import { t } from "../i18n/t";
import type { Cue } from "../types/cue";

export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const DEFAULT_TTS_VOICE = "af_heart";
export const DEFAULT_TTS_SPEED = 1;
export const TTS_SAMPLE_RATE = 24_000;
export const TTS_AUTO_GENERATE_DEBOUNCE_MS = 30_000;

/** Voices shipped with kokoro-js (American + British English subset). */
export const TTS_VOICE_OPTIONS = [
  "af_heart",
  "af_bella",
  "af_nova",
  "af_sarah",
  "af_sky",
  "am_adam",
  "am_michael",
  "am_puck",
  "bf_emma",
  "bm_george",
] as const;

export type TtsVoiceId = (typeof TTS_VOICE_OPTIONS)[number];

export function isTtsCue(cue: Cue): boolean {
  return cue.type === "tts";
}

/** Cues routed through the audio engine (decoded buffer playback). */
export function isAudioPlaybackCue(cue: Cue): boolean {
  return cue.type === "audio" || cue.type === "tts";
}

export function ttsAssetPath(cueId: string): string {
  return `/assets/tts/cue-${cueId}.wav`;
}

export function buildTtsGeneratedKey(text: string, voice: string, speed: number): string {
  return `${voice}|${speed}|${text.trim()}`;
}

export function getTtsGeneratedKey(cue: Cue): string {
  return buildTtsGeneratedKey(
    cue.ttsText ?? "",
    cue.ttsVoice ?? DEFAULT_TTS_VOICE,
    cue.ttsSpeed ?? DEFAULT_TTS_SPEED,
  );
}

export function isTtsGenerationStale(cue: Cue): boolean {
  if (!isTtsCue(cue)) return false;
  if (!cue.assetPath) return true;
  return cue.ttsGeneratedKey !== getTtsGeneratedKey(cue);
}

export function getTtsCueWarning(cue: Cue): { title: string; detail: string } | null {
  if (!isTtsCue(cue)) return null;
  if (!cue.ttsText?.trim()) {
    return {
      title: t("tts.noText"),
      detail: t("tts.enterTextHint"),
    };
  }
  if (!cue.assetPath || isTtsGenerationStale(cue)) {
    return {
      title: t("tts.notGenerated"),
      detail: t("tts.generateHint"),
    };
  }
  return null;
}
