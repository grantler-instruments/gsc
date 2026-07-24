export type SettingsCategory = "general" | "audio" | "speech" | "video" | "dmx" | "midi" | "remote";

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  "general",
  "audio",
  "speech",
  "video",
  "dmx",
  "midi",
  "remote",
];

export const CATEGORY_LABEL_KEYS: Record<SettingsCategory, string> = {
  general: "settings.categoryGeneral",
  audio: "settings.categoryAudio",
  speech: "settings.categorySpeech",
  video: "settings.categoryVideo",
  dmx: "settings.categoryDmx",
  midi: "settings.categoryMidi",
  remote: "settings.categoryRemote",
};

export const DEFAULT_SELECT_VALUE = "";
