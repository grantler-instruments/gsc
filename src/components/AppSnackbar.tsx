import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import { APP_VERSION } from "../lib/app-version";
import { type NotificationSeverity, useNotificationsStore } from "../stores/notifications";
import { usePreferencesStore } from "../stores/preferences";

const AUTO_HIDE_MS: Record<NotificationSeverity, number> = {
  error: 8000,
  warning: 7000,
  info: 6000,
  success: 5000,
};

export function AppSnackbar() {
  const current = useNotificationsStore((s) => s.queue[0]);
  const dismiss = useNotificationsStore((s) => s.dismiss);
  const setAcknowledgedUpdateVersion = usePreferencesStore((s) => s.setAcknowledgedUpdateVersion);

  const acknowledgeUpdate = () => {
    if (current?.updateVersion) {
      setAcknowledgedUpdateVersion(current.updateVersion, APP_VERSION);
    }
  };

  const handleClose = () => {
    acknowledgeUpdate();
    if (current) dismiss(current.id);
  };

  return (
    <Snackbar
      open={!!current}
      autoHideDuration={current ? AUTO_HIDE_MS[current.severity] : undefined}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      {current ? (
        <Alert
          onClose={handleClose}
          severity={current.severity}
          variant="filled"
          sx={{ width: "100%" }}
          action={
            current.action ? (
              <Button
                color="inherit"
                size="small"
                href={current.action.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={acknowledgeUpdate}
              >
                {current.action.label}
              </Button>
            ) : undefined
          }
        >
          {current.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
