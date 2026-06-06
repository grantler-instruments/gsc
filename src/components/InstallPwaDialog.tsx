import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { isIosDevice } from "../lib/pwa-install";

interface InstallPwaDialogProps {
  open: boolean;
  onClose: () => void;
}

export function InstallPwaDialog({ open, onClose }: InstallPwaDialogProps) {
  const { t } = useTranslation();
  const bodyKey = isIosDevice() ? "installPwa.iosBody" : "installPwa.desktopBody";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("installPwa.title")}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">{t(bodyKey)}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.action.close")}</Button>
      </DialogActions>
    </Dialog>
  );
}
