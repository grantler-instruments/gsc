import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import {
  resolveDiscardDraftChoice,
  useDiscardDraftPromptStore,
} from "../stores/discard-draft-prompt";

export function DiscardDraftDialog() {
  const { t } = useTranslation();
  const open = useDiscardDraftPromptStore((s) => s.open);
  const projectName = useDiscardDraftPromptStore((s) => s.projectName);

  return (
    <Dialog open={open} onClose={() => resolveDiscardDraftChoice(false)} maxWidth="xs" fullWidth>
      <DialogTitle>{t("discardDraft.title")}</DialogTitle>
      <DialogContent>
        <Typography sx={{ m: 0, fontSize: 14, color: "text.secondary" }}>
          {t("discardDraft.body", { projectName })}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => resolveDiscardDraftChoice(false)}>
          {t("common.action.cancel")}
        </Button>
        <Button color="error" variant="contained" onClick={() => resolveDiscardDraftChoice(true)}>
          {t("discardDraft.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
