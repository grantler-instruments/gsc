import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { NDI_ENABLED } from "../../types/ndi";
import { inspectorFieldsSx } from "../inspectorSx";
import { NdiSettingsPanel } from "../NdiSettingsPanel";

interface SettingsVideoPanelProps {
  isTauri: boolean;
}

export function SettingsVideoPanel({ isTauri }: SettingsVideoPanelProps) {
  const { t } = useTranslation();

  return (
    <Stack sx={inspectorFieldsSx} spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {t("videoOutput.settingsHint")}
      </Typography>
      {isTauri && NDI_ENABLED ? (
        <NdiSettingsPanel />
      ) : !isTauri ? (
        <Typography variant="body2" color="text.secondary">
          {t("settings.videoDesktopOnly")}
        </Typography>
      ) : null}
    </Stack>
  );
}
