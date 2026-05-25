import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getNdiOutputStatus, listNdiSources, ndiIsAvailable } from "../platform/ndi";
import { usePreferencesStore } from "../stores/preferences";
import type { NdiOutputStatus, NdiSourceInfo } from "../types/ndi";
import { inspectorFieldLabelSx, inspectorFieldSx } from "./inspectorSx";

export function NdiSettingsPanel() {
  const { t } = useTranslation();
  const ndiOutputEnabled = usePreferencesStore((s) => s.ndiOutputEnabled);
  const ndiSourceName = usePreferencesStore((s) => s.ndiSourceName);
  const ndiOutputWidth = usePreferencesStore((s) => s.ndiOutputWidth);
  const ndiOutputHeight = usePreferencesStore((s) => s.ndiOutputHeight);
  const ndiOutputFps = usePreferencesStore((s) => s.ndiOutputFps);
  const setNdiOutputEnabled = usePreferencesStore((s) => s.setNdiOutputEnabled);
  const setNdiSourceName = usePreferencesStore((s) => s.setNdiSourceName);
  const setNdiOutputWidth = usePreferencesStore((s) => s.setNdiOutputWidth);
  const setNdiOutputHeight = usePreferencesStore((s) => s.setNdiOutputHeight);
  const setNdiOutputFps = usePreferencesStore((s) => s.setNdiOutputFps);

  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<NdiOutputStatus | null>(null);
  const [sources, setSources] = useState<NdiSourceInfo[]>([]);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await ndiIsAvailable();
      if (!cancelled) setAvailable(ok);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ndiOutputEnabled) {
      setStatus(null);
      return;
    }

    let cancelled = false;
    const refresh = async () => {
      try {
        const next = await getNdiOutputStatus();
        if (!cancelled) setStatus(next);
      } catch {
        if (!cancelled) setStatus(null);
      }
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [ndiOutputEnabled]);

  const refreshSources = async () => {
    setSourcesError(null);
    try {
      setSources(await listNdiSources(3000));
    } catch (err) {
      setSources([]);
      setSourcesError(err instanceof Error ? err.message : t("settings.ndiSourcesError"));
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {t("settings.ndiDescription")}{" "}
        <Link href="https://ndi.video/" target="_blank" rel="noopener noreferrer">
          ndi.video
        </Link>
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t("settings.ndiTrademark")}
      </Typography>

      {!available ? (
        <Typography variant="body2" color="warning.main">
          {t("settings.ndiUnavailable")}
        </Typography>
      ) : null}

      <FormControlLabel
        control={
          <Switch
            checked={ndiOutputEnabled}
            disabled={!available}
            onChange={(_, checked) => setNdiOutputEnabled(checked)}
          />
        }
        label={t("settings.ndiProgramOutput")}
      />

      <Box sx={inspectorFieldSx}>
        <Typography component="label" htmlFor="ndi-source-name" sx={inspectorFieldLabelSx}>
          {t("settings.ndiSourceName")}
        </Typography>
        <TextField
          id="ndi-source-name"
          size="small"
          fullWidth
          disabled={!available}
          value={ndiSourceName}
          onChange={(e) => setNdiSourceName(e.target.value)}
        />
      </Box>

      <Stack direction="row" spacing={1}>
        <Box sx={{ ...inspectorFieldSx, flex: 1 }}>
          <Typography component="label" htmlFor="ndi-width" sx={inspectorFieldLabelSx}>
            {t("settings.ndiWidth")}
          </Typography>
          <TextField
            id="ndi-width"
            size="small"
            fullWidth
            type="number"
            disabled={!available}
            slotProps={{ htmlInput: { min: 320, max: 3840 } }}
            value={ndiOutputWidth}
            onChange={(e) => {
              const next = Number.parseInt(e.target.value, 10);
              setNdiOutputWidth(Number.isFinite(next) ? next : 1280);
            }}
          />
        </Box>
        <Box sx={{ ...inspectorFieldSx, flex: 1 }}>
          <Typography component="label" htmlFor="ndi-height" sx={inspectorFieldLabelSx}>
            {t("settings.ndiHeight")}
          </Typography>
          <TextField
            id="ndi-height"
            size="small"
            fullWidth
            type="number"
            disabled={!available}
            slotProps={{ htmlInput: { min: 240, max: 2160 } }}
            value={ndiOutputHeight}
            onChange={(e) => {
              const next = Number.parseInt(e.target.value, 10);
              setNdiOutputHeight(Number.isFinite(next) ? next : 720);
            }}
          />
        </Box>
        <Box sx={{ ...inspectorFieldSx, flex: 1 }}>
          <Typography component="label" htmlFor="ndi-fps" sx={inspectorFieldLabelSx}>
            {t("settings.ndiFps")}
          </Typography>
          <Select
            id="ndi-fps"
            size="small"
            fullWidth
            disabled={!available}
            value={ndiOutputFps}
            onChange={(e) => setNdiOutputFps(Number(e.target.value))}
          >
            <MenuItem value={24}>24</MenuItem>
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={30}>30</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={60}>60</MenuItem>
          </Select>
        </Box>
      </Stack>

      {ndiOutputEnabled && status ? (
        <Typography variant="caption" color="text.secondary">
          {status.running
            ? t("settings.ndiStatusRunning", {
                width: status.width,
                height: status.height,
                fps: status.fps,
                frames: status.framesSent,
                receivers: status.connectionCount,
              })
            : t("settings.ndiStatusStopped")}
          {status.lastError ? ` — ${status.lastError}` : ""}
        </Typography>
      ) : null}

      {ndiOutputEnabled ? (
        <Typography variant="caption" color="text.secondary">
          {t("settings.ndiOutputWindowHint")}
        </Typography>
      ) : null}

      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography
          component="button"
          type="button"
          variant="body2"
          onClick={() => {
            void refreshSources();
          }}
          sx={{
            border: 0,
            background: "none",
            color: "primary.main",
            cursor: "pointer",
            p: 0,
            textAlign: "left",
          }}
        >
          {t("settings.ndiRefreshSources")}
        </Typography>
      </Stack>
      {sourcesError ? (
        <Typography variant="caption" color="error">
          {sourcesError}
        </Typography>
      ) : null}
      {sources.length > 0 ? (
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {sources.map((source) => (
            <Typography
              component="li"
              key={`${source.name}-${source.urlAddress}`}
              variant="caption"
            >
              {source.name}
              {source.urlAddress ? ` (${source.urlAddress})` : ""}
            </Typography>
          ))}
        </Box>
      ) : null}
    </Stack>
  );
}
