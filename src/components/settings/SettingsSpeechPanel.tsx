import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "../../stores/preferences";
import { useSpeechModelStore } from "../../stores/speech-model";
import { inspectorFieldsSx } from "../inspectorSx";

export function SettingsSpeechPanel() {
  const { t } = useTranslation();
  const speechModelReady = usePreferencesStore((s) => s.speechModelReady);
  const status = useSpeechModelStore((s) => s.status);
  const progress = useSpeechModelStore((s) => s.progress);
  const loadPhase = useSpeechModelStore((s) => s.loadPhase);
  const userDownloadActive = useSpeechModelStore((s) => s.userDownloadActive);
  const statusMessage = useSpeechModelStore((s) => s.statusMessage);
  const error = useSpeechModelStore((s) => s.error);
  const downloadModel = useSpeechModelStore((s) => s.downloadModel);
  const clearModel = useSpeechModelStore((s) => s.clearModel);
  const warmUpIfReady = useSpeechModelStore((s) => s.warmUpIfReady);

  useEffect(() => {
    if (!speechModelReady) return;
    void warmUpIfReady();
  }, [speechModelReady, warmUpIfReady]);

  const loading = status === "loading";
  const installed = speechModelReady;
  const ready = installed && status === "ready";
  const warmingUp = installed && loading && !userDownloadActive;
  const loadFailed = installed && status === "error";
  const showDownloadProgress = loading && userDownloadActive;

  return (
    <Stack sx={inspectorFieldsSx} spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {t("settings.speechDescription")}
      </Typography>

      {ready ? (
        <Typography variant="body2" color="success.main">
          {t("settings.speechReady")}
        </Typography>
      ) : null}

      {installed && !ready && !loading && !loadFailed ? (
        <Typography variant="body2" color="text.secondary">
          {t("settings.speechInstalled")}
        </Typography>
      ) : null}

      {warmingUp ? (
        <Typography variant="body2" color="text.secondary">
          {t("settings.speechLoading")}
        </Typography>
      ) : null}

      {showDownloadProgress ? (
        <Box>
          <LinearProgress
            variant={loadPhase === "init" || progress === null ? "indeterminate" : "determinate"}
            value={progress ?? 0}
            sx={{ mb: 1 }}
          />
          <Typography variant="caption" color="text.secondary">
            {loadPhase === "init"
              ? t("settings.speechInitializing")
              : statusMessage
                ? t("settings.speechDownloadingFile", { file: statusMessage })
                : t("settings.speechDownloading")}
          </Typography>
        </Box>
      ) : null}

      {error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : null}

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          disabled={loading || (installed && !loadFailed)}
          onClick={() => void downloadModel()}
        >
          {loadFailed ? t("settings.speechRetry") : t("settings.speechDownload")}
        </Button>
        {installed ? (
          <Button variant="outlined" color="inherit" disabled={loading} onClick={clearModel}>
            {t("settings.speechRemove")}
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
