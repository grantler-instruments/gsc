import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Typography from "@mui/material/Typography";
import {
  resolveStartupProjectsChoice,
  useStartupProjectsPromptStore,
} from "../stores/startup-projects-prompt";

function truncatePath(path: string, maxLength = 56): string {
  if (path.length <= maxLength) return path;
  const head = Math.max(20, Math.floor(maxLength * 0.35));
  const tail = maxLength - head - 1;
  return `${path.slice(0, head)}…${path.slice(-tail)}`;
}

export function StartupProjectsDialog() {
  const open = useStartupProjectsPromptStore((s) => s.open);
  const draft = useStartupProjectsPromptStore((s) => s.draft);
  const recents = useStartupProjectsPromptStore((s) => s.recents);

  return (
    <Dialog
      open={open}
      onClose={() => resolveStartupProjectsChoice({ type: "new-show" })}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Open Project</DialogTitle>
      <DialogContent sx={{ px: 0, pt: 0 }}>
        {draft ? (
          <List subheader={<ListSubheader component="div">Unsaved draft</ListSubheader>}>
            <ListItemButton onClick={() => resolveStartupProjectsChoice({ type: "restore-draft" })}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <EditNoteOutlinedIcon fontSize="small" color="warning" />
              </ListItemIcon>
              <ListItemText
                primary={draft.name}
                secondary="Restore work from your last session"
              />
            </ListItemButton>
          </List>
        ) : null}

        {recents.length > 0 ? (
          <List
            subheader={
              <ListSubheader component="div">
                Recent projects
              </ListSubheader>
            }
          >
            {recents.map((entry) => (
              <ListItemButton
                key={entry.path}
                onClick={() =>
                  resolveStartupProjectsChoice({ type: "open-recent", path: entry.path })
                }
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <HistoryOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={entry.name} secondary={truncatePath(entry.path)} />
              </ListItemButton>
            ))}
          </List>
        ) : null}

        {!draft && recents.length === 0 ? (
          <Typography sx={{ px: 3, py: 1, fontSize: 14, color: "text.secondary" }}>
            Choose a recent project, browse for a file, or start a new show.
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => resolveStartupProjectsChoice({ type: "new-show" })}>New Show</Button>
        <Button
          variant="contained"
          startIcon={<FolderOpenOutlinedIcon />}
          onClick={() => resolveStartupProjectsChoice({ type: "browse" })}
        >
          Browse…
        </Button>
      </DialogActions>
    </Dialog>
  );
}
