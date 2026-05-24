import i18n from "./index";

/** Translate outside React components (stores, lib, platform). */
export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}
