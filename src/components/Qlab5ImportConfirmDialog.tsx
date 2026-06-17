import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import {
  resolveQlab5ImportConfirm,
  useQlab5ImportConfirmStore,
} from "../stores/qlab5-import-prompt";

export function Qlab5ImportConfirmDialog() {
  const { t } = useTranslation();
  const open = useQlab5ImportConfirmStore((s) => s.open);
  const pathLabel = useQlab5ImportConfirmStore((s) => s.pathLabel);

  return (
    <Dialog open={open} onClose={() => resolveQlab5ImportConfirm(false)} maxWidth="xs" fullWidth>
      <DialogTitle>{t("qlab5Import.confirmTitle")}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">
          {t("qlab5Import.confirmMessage", { name: pathLabel })}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => resolveQlab5ImportConfirm(false)}>
          {t("common.action.cancel")}
        </Button>
        <Button variant="contained" onClick={() => resolveQlab5ImportConfirm(true)}>
          {t("qlab5Import.confirmImport")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
