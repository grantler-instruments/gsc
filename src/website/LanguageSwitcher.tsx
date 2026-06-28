import TranslateIcon from "@mui/icons-material/Translate";
import { MenuItem, Select, type SelectChangeEvent, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  getAppLocale,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  setAppLocale,
} from "../i18n";

// Mirrors the key/shape used by the preferences store and the website i18n
// bootstrap (`detectInitialLocale`), so a choice here survives reloads and
// stays in sync when the web app is opened from the same origin.
const PREFERENCES_STORAGE_KEY = "gsc-preferences";

function persistLocale(locale: SupportedLocale): void {
  try {
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
    parsed.state = { ...(parsed.state ?? {}), locale };
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore persistence failures (private mode, disabled storage, etc.) */
  }
}

export function LanguageSwitcher() {
  // useTranslation re-renders on languageChanged, so getAppLocale() stays current.
  const { t } = useTranslation();
  const current = getAppLocale();

  const handleChange = (event: SelectChangeEvent) => {
    const locale = event.target.value as SupportedLocale;
    setAppLocale(locale);
    persistLocale(locale);
  };

  return (
    <Select
      value={current}
      onChange={handleChange}
      size="small"
      aria-label={t("website.languageLabel")}
      renderValue={(value) => (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <TranslateIcon fontSize="small" />
          <span>{LOCALE_LABELS[value as SupportedLocale]}</span>
        </Stack>
      )}
      sx={{ "& .MuiSelect-select": { py: 0.75, display: "flex", alignItems: "center" } }}
    >
      {SUPPORTED_LOCALES.map((code) => (
        <MenuItem key={code} value={code}>
          {LOCALE_LABELS[code]}
        </MenuItem>
      ))}
    </Select>
  );
}
