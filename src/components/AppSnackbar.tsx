import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { type NotificationSeverity, useNotificationsStore } from "../stores/notifications";

const AUTO_HIDE_MS: Record<NotificationSeverity, number> = {
  error: 8000,
  warning: 7000,
  info: 6000,
  success: 5000,
};

export function AppSnackbar() {
  const current = useNotificationsStore((s) => s.queue[0]);
  const dismiss = useNotificationsStore((s) => s.dismiss);

  const handleClose = () => {
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
        >
          {current.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
