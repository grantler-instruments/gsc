import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { getCueDisplayName } from "../lib/cues";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useDmxPreviewSessionStore } from "../stores/dmx-preview-session";

export function DmxPreviewConfirmDialog() {
  const confirm = useDmxPreviewSessionStore((s) => s.confirm);
  const resolveConfirm = useDmxPreviewSessionStore((s) => s.resolveConfirm);
  const cancelConfirm = useDmxPreviewSessionStore((s) => s.cancelConfirm);
  const cues = useProjectStore((s) => getActiveCueListFromState(s).cues);

  const cue = confirm ? cues.find((item) => item.id === confirm.cueId) : undefined;
  const cueName = cue ? getCueDisplayName(cue, cues) : "this cue";

  return (
    <Dialog
      open={confirm !== null}
      onClose={cancelConfirm}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Keep preview changes?</DialogTitle>
      <DialogContent>
        <Typography sx={{ m: 0, fontSize: 14, color: "text.secondary" }}>
          {cueName} was edited while previewing on DMX. Keep those changes in the
          cue, or revert to the levels stored when preview started?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={cancelConfirm}>Cancel</Button>
        <Button color="inherit" onClick={() => resolveConfirm(false)}>
          Revert
        </Button>
        <Button variant="contained" onClick={() => resolveConfirm(true)}>
          Keep changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
