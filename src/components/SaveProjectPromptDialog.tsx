import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import {
  resolveSaveProjectNowChoice,
  useSaveProjectPromptStore,
} from "../stores/save-project-prompt";

export function SaveProjectPromptDialog() {
  const { t } = useTranslation();
  const open = useSaveProjectPromptStore((s) => s.open);
  const projectName = useSaveProjectPromptStore((s) => s.projectName);

  return (
    <Dialog
      open={open}
      onClose={() => resolveSaveProjectNowChoice("later")}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{t("project.metadata.saveProjectPrompt.title")}</DialogTitle>
      <DialogContent>
        <Typography sx={{ m: 0, fontSize: 14, color: "text.secondary" }}>
          {t("project.metadata.saveProjectPrompt.body", { projectName })}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => resolveSaveProjectNowChoice("later")}>
          {t("project.metadata.saveProjectPrompt.later")}
        </Button>
        <Button variant="contained" onClick={() => resolveSaveProjectNowChoice("save")}>
          {t("fileMenu.saveAs")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
