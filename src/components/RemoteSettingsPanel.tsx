import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { broadcastRemoteSnapshot } from "../lib/remote-host";
import {
  getRemoteServerStatus,
  startRemoteServer,
  stopRemoteServer,
} from "../platform/remote-server";
import { usePreferencesStore } from "../stores/preferences";
import type { RemoteServerInfo, RemoteServerStatus } from "../types/remote";
import { inspectorFieldLabelSx, inspectorFieldSx, inspectorFieldsSx } from "./inspectorSx";

export function RemoteSettingsPanel() {
  const { t } = useTranslation();
  const remotePort = usePreferencesStore((s) => s.remotePort);
  const setRemotePort = usePreferencesStore((s) => s.setRemotePort);
  const [status, setStatus] = useState<RemoteServerStatus | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const next = await getRemoteServerStatus();
      setStatus(next);
      if (next.running && next.connectUrl) {
        setQrDataUrl(await QRCode.toDataURL(next.connectUrl, { margin: 1, width: 220 }));
      } else {
        setQrDataUrl(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("remote.statusError"));
    }
  }, [t]);

  useEffect(() => {
    void refreshStatus();
    const timer = setInterval(() => {
      void refreshStatus();
    }, 3000);
    return () => clearInterval(timer);
  }, [refreshStatus]);

  const handleStart = async () => {
    setBusy(true);
    setError(null);
    try {
      const info: RemoteServerInfo = await startRemoteServer(remotePort);
      await broadcastRemoteSnapshot();
      setStatus({
        running: true,
        port: info.port,
        pin: info.pin,
        lanIp: info.lanIp,
        connectUrl: info.connectUrl,
        clientCount: 0,
        devMode: info.devMode,
      });
      setQrDataUrl(await QRCode.toDataURL(info.connectUrl, { margin: 1, width: 220 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("remote.startError"));
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    setError(null);
    try {
      await stopRemoteServer();
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("remote.stopError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack sx={{ ...inspectorFieldsSx, gap: 2 }}>
      <Typography component="p" sx={{ m: 0, fontSize: 13, color: "text.secondary" }}>
        {t("remote.description")}
      </Typography>

      <Box>
        <Typography component="label" htmlFor="remote-port" sx={inspectorFieldLabelSx}>
          {t("remote.port")}
        </Typography>
        <TextField
          id="remote-port"
          type="number"
          size="small"
          fullWidth
          value={remotePort}
          disabled={status?.running ?? false}
          onChange={(e) => {
            const parsed = Number.parseInt(e.target.value, 10);
            if (Number.isFinite(parsed) && parsed > 0 && parsed <= 65535) {
              setRemotePort(parsed);
            }
          }}
          sx={inspectorFieldSx}
        />
      </Box>

      <Stack direction="row" sx={{ gap: 1 }}>
        <Button
          variant="contained"
          onClick={() => void handleStart()}
          disabled={busy || (status?.running ?? false)}
        >
          {t("remote.start")}
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={() => void handleStop()}
          disabled={busy || !(status?.running ?? false)}
        >
          {t("remote.stop")}
        </Button>
      </Stack>

      {error ? (
        <Typography component="p" sx={{ m: 0, fontSize: 13, color: "error.main" }}>
          {error}
        </Typography>
      ) : null}

      {status?.running ? (
        <Stack sx={{ gap: 1.5, alignItems: "flex-start" }}>
          {qrDataUrl ? (
            <Box
              component="img"
              src={qrDataUrl}
              alt={t("remote.qrAlt")}
              sx={{ width: 220, height: 220, borderRadius: 1, bgcolor: "#fff", p: 1 }}
            />
          ) : null}
          <Typography component="p" sx={{ m: 0, fontSize: 13 }}>
            {t("remote.pinLabel")}: <strong>{status.pin}</strong>
          </Typography>
          <Typography component="p" sx={{ m: 0, fontSize: 13, wordBreak: "break-all" }}>
            {t("remote.urlLabel")}: {status.connectUrl}
          </Typography>
          <Typography component="p" sx={{ m: 0, fontSize: 13, color: "text.secondary" }}>
            {t("remote.clientsConnected", { count: status.clientCount })}
          </Typography>
          <Typography component="p" sx={{ m: 0, fontSize: 12, color: "text.secondary" }}>
            {status.devMode ? t("remote.devHint") : t("remote.buildHint")}
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  );
}
