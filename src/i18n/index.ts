import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { applyDocumentDirection } from "./direction";
import ar from "./locales/ar.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import zh from "./locales/zh.json";

export const SUPPORTED_LOCALES = ["en", "de", "es", "zh", "ar"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  zh: "中文",
  ar: "العربية",
};

const PREFERENCES_STORAGE_KEY = "gsc-preferences";

function isBrowserStorageAvailable(): boolean {
  try {
    return typeof localStorage !== "undefined" && typeof localStorage.getItem === "function";
  } catch {
    return false;
  }
}

function readLocaleFromPreferences(): SupportedLocale | null {
  if (!isBrowserStorageAvailable()) return null;
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

  // Existing preferences without a locale field (pre-i18n) — default English.
  if (isBrowserStorageAvailable() && localStorage.getItem(PREFERENCES_STORAGE_KEY)) return "en";

  const browserLanguage =
    typeof navigator !== "undefined" ? navigator.language?.split("-")[0] : undefined;
  if (browserLanguage && SUPPORTED_LOCALES.includes(browserLanguage as SupportedLocale)) {
    return browserLanguage as SupportedLocale;
  }
  return "en";
}

const initialLocale = detectInitialLocale();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    es: { translation: es },
    zh: { translation: zh },
    ar: { translation: ar },
  },
  lng: initialLocale,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// Keep the document direction (LTR/RTL) in sync with the active locale for all
// change paths (settings, website switcher, store rehydration).
i18n.on("languageChanged", (lng) => applyDocumentDirection(lng));
applyDocumentDirection(initialLocale);

export function setAppLocale(locale: SupportedLocale): void {
  void i18n.changeLanguage(locale);
}

export function getAppLocale(): SupportedLocale {
  const lng = i18n.language.split("-")[0];
  return SUPPORTED_LOCALES.includes(lng as SupportedLocale) ? (lng as SupportedLocale) : "en";
}

export default i18n;
