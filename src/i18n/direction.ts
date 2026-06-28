import type { SupportedLocale } from "./index";

export type TextDirection = "ltr" | "rtl";

/** Locales that render right-to-left. */
export const RTL_LOCALES: readonly SupportedLocale[] = ["ar"];

export function isRtlLocale(locale: string): boolean {
  const base = locale.split("-")[0] as SupportedLocale;
  return RTL_LOCALES.includes(base);
}

export function getDirection(locale: string): TextDirection {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}

/** Mirror the active locale onto the document so native flow follows it. */
export function applyDocumentDirection(locale: string): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dir = getDirection(locale);
  root.lang = locale.split("-")[0];
}
