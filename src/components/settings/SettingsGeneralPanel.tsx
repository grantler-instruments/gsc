import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type SupportedLocale } from "../../i18n";
import { APP_VERSION } from "../../lib/app-version";
import type { StoragePressure } from "../../lib/storage-persistence";
import { usePreferencesStore } from "../../stores/preferences";
import { inspectorFieldLabelSx, inspectorFieldSx, inspectorFieldsSx } from "../inspectorSx";

interface SettingsGeneralPanelProps {
  isTauri: boolean;
  storageLabel: string | null;
  storagePressure: StoragePressure;
  storagePersisted: boolean | null;
}

export function SettingsGeneralPanel({
  isTauri,
  storageLabel,
  storagePressure,
  storagePersisted,
}: SettingsGeneralPanelProps) {
  const { t } = useTranslation();
  const locale = usePreferencesStore((s) => s.locale);
  const setLocale = usePreferencesStore((s) => s.setLocale);
  const performanceHudEnabled = usePreferencesStore((s) => s.performanceHudEnabled);
  const setPerformanceHudEnabled = usePreferencesStore((s) => s.setPerformanceHudEnabled);

  return (
    <Stack sx={inspectorFieldsSx}>
      <Box sx={inspectorFieldSx}>
        <Typography component="label" htmlFor="language-select" sx={inspectorFieldLabelSx}>
          {t("language.label")}
        </Typography>
        <Select
          id="language-select"
          size="small"
          fullWidth
          value={locale}
          onChange={(e) => setLocale(e.target.value as SupportedLocale)}
        >
          {SUPPORTED_LOCALES.map((code) => (
            <MenuItem key={code} value={code}>
              {LOCALE_LABELS[code]}
            </MenuItem>
          ))}
        </Select>
      </Box>
      <Box sx={inspectorFieldSx}>
        <FormControlLabel
          control={
            <Switch
              checked={performanceHudEnabled}
              onChange={(_, checked) => setPerformanceHudEnabled(checked)}
            />
          }
          label={t("settings.performanceHud")}
        />
        <Typography variant="caption" color="text.secondary">
          {t("settings.performanceHudHint")}
        </Typography>
      </Box>
      {!isTauri ? (
        <Box sx={inspectorFieldSx}>
          <Typography sx={inspectorFieldLabelSx}>{t("settings.storageTitle")}</Typography>
          <Typography variant="body2" color="text.secondary">
            {storageLabel ?? t("settings.storageUnavailable")}
          </Typography>
          {storagePressure === "warning" ? (
            <Typography variant="caption" color="warning.main">
              {t("settings.storageWarning")}
            </Typography>
          ) : null}
          {storagePressure === "critical" ? (
            <Typography variant="caption" color="error">
              {t("settings.storageCritical")}
            </Typography>
          ) : null}
          {storagePersisted !== null ? (
            <Typography variant="caption" color="text.secondary">
              {storagePersisted
                ? t("settings.storagePersisted")
                : t("settings.storageNotPersisted")}
            </Typography>
          ) : null}
        </Box>
      ) : null}
      <Box sx={inspectorFieldSx}>
        <Typography sx={inspectorFieldLabelSx}>{t("settings.version")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {APP_VERSION}
        </Typography>
      </Box>
    </Stack>
  );
}
