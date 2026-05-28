import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRemoteClient } from "../hooks/useRemoteClient";
import { useRemoteKeyboard } from "../hooks/useRemoteKeyboard";
import { connectRemoteClient, getRemoteConnectionState, subscribeRemoteConnection } from "../lib/remote-client";
import { remotePinFromUrl, setRemotePinForSession } from "../platform/remote-mode";
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
  const [enteredPin, setEnteredPin] = useState("");
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

  const needsPin = !pin;
  const validEnteredPin = /^\d{6}$/.test(enteredPin);

  const handlePinSubmit = () => {
    if (!validEnteredPin) return;
    setRemotePinForSession(enteredPin);
    connectRemoteClient();
  };

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
        {needsPin && (
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

      <Dialog open={needsPin} maxWidth="xs" fullWidth>
        <DialogTitle>{t("remote.enterPinTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t("remote.enterPinDescription")}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            value={enteredPin}
            onChange={(event) => {
              const next = event.target.value.replace(/\D/g, "").slice(0, 6);
              setEnteredPin(next);
            }}
            slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 } }}
            placeholder="123456"
            label={t("remote.pinLabel")}
            error={enteredPin.length > 0 && !validEnteredPin}
            helperText={
              enteredPin.length > 0 && !validEnteredPin ? t("remote.enterPinValidation") : " "
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handlePinSubmit();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePinSubmit} variant="contained" disabled={!validEnteredPin}>
            {t("common.action.connect")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
