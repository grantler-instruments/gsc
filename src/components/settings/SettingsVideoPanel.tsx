import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { inspectorFieldsSx } from "../inspectorSx";
import { NdiSettingsPanel } from "../NdiSettingsPanel";

interface SettingsVideoPanelProps {
  isTauri: boolean;
}

export function SettingsVideoPanel({ isTauri }: SettingsVideoPanelProps) {
  const { t } = useTranslation();

  return (
    <Stack sx={inspectorFieldsSx}>
      {isTauri ? (
        <NdiSettingsPanel />
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t("settings.videoDesktopOnly")}
        </Typography>
      )}
    </Stack>
  );
}
