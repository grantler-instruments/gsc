import { getPlatform } from "../platform";

type PhonemizerModule = typeof import("phonemizer-original");

let webModulePromise: Promise<PhonemizerModule> | null = null;

async function loadWebPhonemizer(): Promise<PhonemizerModule> {
  webModulePromise ??= import("phonemizer-original");
  return webModulePromise;
}

/** Drop-in replacement for the `phonemizer` package — native espeak on Tauri desktop. */
export async function phonemize(text: string, language?: string): Promise<string[]> {
  if (getPlatform() === "tauri") {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string[]>("kokoro_phonemize", {
      text,
      language: language ?? "en-us",
    });
  }

  const mod = await loadWebPhonemizer();
  return mod.phonemize(text, language);
}

export async function list_voices(language?: string) {
  const mod = await loadWebPhonemizer();
  return mod.list_voices(language);
}
