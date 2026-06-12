import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { BUNDLE_EXTENSION } from "../lib/project-paths";
import {
  resolveDeleteStoredProjectChoice,
  useDeleteStoredProjectPromptStore,
} from "../stores/delete-stored-project-prompt";

export function DeleteStoredProjectDialog() {
  const { t } = useTranslation();
  const open = useDeleteStoredProjectPromptStore((s) => s.open);
  const projectName = useDeleteStoredProjectPromptStore((s) => s.projectName);

  return (
    <Dialog
      open={open}
      onClose={() => resolveDeleteStoredProjectChoice(false)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{t("deleteStoredProject.title")}</DialogTitle>
      <DialogContent>
        <Typography sx={{ m: 0, fontSize: 14, color: "text.secondary" }}>
          {t("deleteStoredProject.body", { projectName, extension: BUNDLE_EXTENSION })}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => resolveDeleteStoredProjectChoice(false)}>
          {t("common.action.cancel")}
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={() => resolveDeleteStoredProjectChoice(true)}
        >
          {t("common.action.delete")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
