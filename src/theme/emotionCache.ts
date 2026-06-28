import createCache, { type EmotionCache } from "@emotion/cache";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";

/**
 * Two caches so MUI/emotion styles flip for RTL locales (Arabic). The RTL cache
 * runs `stylis-plugin-rtl`, which converts physical CSS (margin-left, etc.) to
 * its mirrored counterpart at insertion time.
 */
export const ltrCache: EmotionCache = createCache({ key: "mui" });

export const rtlCache: EmotionCache = createCache({
  key: "mui-rtl",
  stylisPlugins: [prefixer, rtlPlugin],
});

export function emotionCacheForDirection(direction: "ltr" | "rtl"): EmotionCache {
  return direction === "rtl" ? rtlCache : ltrCache;
}
