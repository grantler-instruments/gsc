import { useEffect } from "react";
import { usePreferencesStore } from "../stores/preferences";
import { setAppLocale } from "./index";

/** Keep i18next in sync with persisted locale (store rehydrates after i18n init). */
export function useSyncAppLocale(): void {
  const locale = usePreferencesStore((s) => s.locale);
  useEffect(() => {
    setAppLocale(locale);
  }, [locale]);
}
