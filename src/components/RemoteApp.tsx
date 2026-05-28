import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRemoteClient } from "../hooks/useRemoteClient";
import { useRemoteKeyboard } from "../hooks/useRemoteKeyboard";
import { getRemoteConnectionState, subscribeRemoteConnection } from "../lib/remote-client";
import { remotePinFromUrl } from "../platform/remote-mode";
import { AppSnackbar } from "./AppSnackbar";
import { CueList } from "./CueList";
import { LeftSidebar } from "./LeftSidebar";
import { TransportBar } from "./TransportBar";

/** Phone/tablet remote — show-mode UI only, no local engines. */
export function RemoteApp() {
  const { t } = useTranslation();
  useRemoteClient();
  useRemoteKeyboard();
  const [connectionState, setConnectionState] = useState(getRemoteConnectionState());
  const pin = remotePinFromUrl();

  useEffect(() => subscribeRemoteConnection(setConnectionState), []);

  const statusLabel =
    connectionState === "connected"
      ? t("remote.statusConnected")
      : connectionState === "connecting"
        ? t("remote.statusConnecting")
        : connectionState === "auth-failed"
          ? t("remote.statusAuthFailed")
          : t("remote.statusDisconnected");

  const statusColor =
    connectionState === "connected"
      ? "success"
      : connectionState === "auth-failed"
        ? "error"
        : "default";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "100vh" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 0.75,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle2" sx={{ flex: 1, m: 0 }}>
          {t("remote.title")}
        </Typography>
        <Chip label={statusLabel} size="small" color={statusColor} />
        {!pin && (
          <Typography variant="caption" color="error">
            {t("remote.missingPin")}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        <LeftSidebar />
        <Box
          component="main"
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <CueList />
        </Box>
      </Box>

      <TransportBar />
      <AppSnackbar />
    </Box>
  );
}
