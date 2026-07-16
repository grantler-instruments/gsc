import { CacheProvider } from "@emotion/react";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, type Theme, ThemeProvider } from "@mui/material/styles";
import { type ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getDirection } from "../i18n/direction";
import { emotionCacheForDirection } from "./emotionCache";

/**
 * Wraps MUI's theme/baseline with locale-aware direction. Re-renders on
 * `languageChanged` (via `useTranslation`), swapping both the emotion cache and
 * the theme `direction` so the whole tree mirrors for RTL locales.
 */
export function DirectionalThemeProvider({
  baseTheme,
  children,
}: {
  baseTheme: Theme;
  children: ReactNode;
}) {
  const { i18n } = useTranslation();
  const direction = getDirection(i18n.language);

  const theme = useMemo(
    () => (baseTheme.direction === direction ? baseTheme : createTheme(baseTheme, { direction })),
    [baseTheme, direction],
  );
  const cache = emotionCacheForDirection(direction);

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
