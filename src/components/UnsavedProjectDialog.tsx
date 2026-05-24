import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import {
  resolveUnsavedProjectChoice,
  useUnsavedProjectPromptStore,
} from "../stores/unsaved-project-prompt";

export function UnsavedProjectDialog() {
  const open = useUnsavedProjectPromptStore((s) => s.open);
  const projectName = useUnsavedProjectPromptStore((s) => s.projectName);

  return (
    <Dialog
      open={open}
      onClose={() => resolveUnsavedProjectChoice("cancel")}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Save changes?</DialogTitle>
      <DialogContent>
        <Typography sx={{ m: 0, fontSize: 14, color: "text.secondary" }}>
          Do you want to save the changes you made to “{projectName}” before creating a new project?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => resolveUnsavedProjectChoice("cancel")}>Cancel</Button>
        <Button color="inherit" onClick={() => resolveUnsavedProjectChoice("discard")}>
          Don&apos;t Save
        </Button>
        <Button variant="contained" onClick={() => resolveUnsavedProjectChoice("save")}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
