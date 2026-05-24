import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { getCueDisplayName } from "../lib/cues";
import { useDmxPreviewSessionStore } from "../stores/dmx-preview-session";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";

export function DmxPreviewConfirmDialog() {
  const { t } = useTranslation();
  const confirm = useDmxPreviewSessionStore((s) => s.confirm);
  const resolveConfirm = useDmxPreviewSessionStore((s) => s.resolveConfirm);
  const cancelConfirm = useDmxPreviewSessionStore((s) => s.cancelConfirm);
  const cues = useProjectStore((s) => getActiveCueListFromState(s).cues);

  const cue = confirm ? cues.find((item) => item.id === confirm.cueId) : undefined;
  const cueName = cue ? getCueDisplayName(cue, cues) : "";

  return (
    <Dialog open={confirm !== null} onClose={cancelConfirm} maxWidth="xs" fullWidth>
      <DialogTitle>{t("dmxPreview.title")}</DialogTitle>
      <DialogContent>
        <Typography sx={{ m: 0, fontSize: 14, color: "text.secondary" }}>
          {t("dmxPreview.body", { cueName })}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={cancelConfirm}>{t("common.action.cancel")}</Button>
        <Button color="inherit" onClick={() => resolveConfirm(false)}>
          {t("common.action.revert")}
        </Button>
        <Button variant="contained" onClick={() => resolveConfirm(true)}>
          {t("common.action.keepChanges")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
