import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import zh from "./locales/zh.json";

export const SUPPORTED_LOCALES = ["en", "de", "es", "zh"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  zh: "中文",
};

const PREFERENCES_STORAGE_KEY = "gsc-preferences";

function readLocaleFromPreferences(): SupportedLocale | null {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { locale?: string } };
    const locale = parsed.state?.locale;
    if (locale && SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
      return locale as SupportedLocale;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function detectInitialLocale(): SupportedLocale {
  const fromPreferences = readLocaleFromPreferences();
  if (fromPreferences) return fromPreferences;
  const browser = navigator.language.split("-")[0];
  if (SUPPORTED_LOCALES.includes(browser as SupportedLocale)) {
    return browser as SupportedLocale;
  }
  return "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    es: { translation: es },
    zh: { translation: zh },
  },
  lng: detectInitialLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setAppLocale(locale: SupportedLocale): void {
  void i18n.changeLanguage(locale);
}

export function getAppLocale(): SupportedLocale {
  const lng = i18n.language.split("-")[0];
  return SUPPORTED_LOCALES.includes(lng as SupportedLocale) ? (lng as SupportedLocale) : "en";
}

export default i18n;
