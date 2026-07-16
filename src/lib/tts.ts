import { t } from "../i18n/t";
import { getPlatform } from "../platform";
import type { Cue } from "../types/cue";

export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const DEFAULT_TTS_SPEED = 1;
export const DEFAULT_TTS_LANG = "en";
export const TTS_SAMPLE_RATE = 24_000;
export const TTS_AUTO_GENERATE_DEBOUNCE_MS = 30_000;

export type TtsEngineId = "kokoro" | "supertonic";

/** Voices shipped with kokoro-js (American + British English subset). */
export const KOKORO_VOICE_OPTIONS = [
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

/** Supertonic 3 preset voice styles (desktop). */
export const SUPERTONIC_VOICE_OPTIONS = [
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
] as const;

/** Languages supported by Supertonic 3 (`na` = language-agnostic). */
export const SUPERTONIC_LANG_OPTIONS = [
  "en",
  "de",
  "fr",
  "es",
  "it",
  "pt",
  "nl",
  "pl",
  "ru",
  "uk",
  "cs",
  "sk",
  "sl",
  "hr",
  "bg",
  "ro",
  "hu",
  "el",
  "tr",
  "sv",
  "da",
  "fi",
  "et",
  "lv",
  "lt",
  "id",
  "vi",
  "hi",
  "ar",
  "ja",
  "ko",
  "na",
] as const;

/** @deprecated Prefer KOKORO_VOICE_OPTIONS / getTtsVoiceOptions(). */
export const TTS_VOICE_OPTIONS = KOKORO_VOICE_OPTIONS;

export type TtsVoiceId =
  | (typeof KOKORO_VOICE_OPTIONS)[number]
  | (typeof SUPERTONIC_VOICE_OPTIONS)[number];

export function getTtsEngine(): TtsEngineId {
  return getPlatform() === "tauri" ? "supertonic" : "kokoro";
}

export function getDefaultTtsVoice(engine: TtsEngineId = getTtsEngine()): string {
  return engine === "supertonic" ? "M1" : "af_heart";
}

/** @deprecated Use getDefaultTtsVoice(). */
export const DEFAULT_TTS_VOICE = "af_heart";

export function getTtsVoiceOptions(engine: TtsEngineId = getTtsEngine()): readonly string[] {
  return engine === "supertonic" ? SUPERTONIC_VOICE_OPTIONS : KOKORO_VOICE_OPTIONS;
}

export function resolveTtsVoice(
  voice: string | undefined,
  engine: TtsEngineId = getTtsEngine(),
): string {
  const options = getTtsVoiceOptions(engine);
  if (voice && options.includes(voice)) return voice;
  return getDefaultTtsVoice(engine);
}

export function resolveTtsLang(
  lang: string | undefined,
  engine: TtsEngineId = getTtsEngine(),
): string {
  if (engine === "kokoro") return "en";
  if (lang && (SUPERTONIC_LANG_OPTIONS as readonly string[]).includes(lang)) return lang;
  return DEFAULT_TTS_LANG;
}

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

export function buildTtsGeneratedKey(
  text: string,
  voice: string,
  speed: number,
  lang: string = DEFAULT_TTS_LANG,
  engine: TtsEngineId = getTtsEngine(),
): string {
  return `${engine}|${lang}|${voice}|${speed}|${text.trim()}`;
}

export function getTtsGeneratedKey(cue: Cue, engine: TtsEngineId = getTtsEngine()): string {
  const voice = resolveTtsVoice(cue.ttsVoice, engine);
  const lang = resolveTtsLang(cue.ttsLang, engine);
  return buildTtsGeneratedKey(
    cue.ttsText ?? "",
    voice,
    cue.ttsSpeed ?? DEFAULT_TTS_SPEED,
    lang,
    engine,
  );
}

export function isTtsGenerationStale(cue: Cue, engine: TtsEngineId = getTtsEngine()): boolean {
  if (!isTtsCue(cue)) return false;
  if (!cue.assetPath) return true;
  return cue.ttsGeneratedKey !== getTtsGeneratedKey(cue, engine);
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
