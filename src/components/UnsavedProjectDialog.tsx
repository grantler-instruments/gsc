import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import {
  resolveUnsavedProjectChoice,
  useUnsavedProjectPromptStore,
} from "../stores/unsaved-project-prompt";

export function UnsavedProjectDialog() {
  const { t } = useTranslation();
  const open = useUnsavedProjectPromptStore((s) => s.open);
  const projectName = useUnsavedProjectPromptStore((s) => s.projectName);
  const bodyKey = useUnsavedProjectPromptStore((s) => s.bodyKey);

  return (
    <Dialog
      open={open}
      onClose={() => resolveUnsavedProjectChoice("cancel")}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{t("unsaved.title")}</DialogTitle>
      <DialogContent>
        <Typography sx={{ m: 0, fontSize: 14, color: "text.secondary" }}>
          {t(bodyKey, { projectName })}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => resolveUnsavedProjectChoice("cancel")}>
          {t("common.action.cancel")}
        </Button>
        <Button color="inherit" onClick={() => resolveUnsavedProjectChoice("discard")}>
          {t("common.action.dontSave")}
        </Button>
        <Button variant="contained" onClick={() => resolveUnsavedProjectChoice("save")}>
          {t("common.action.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
