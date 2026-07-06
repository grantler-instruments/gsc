import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { removeRecentProject } from "../lib/recent-projects";
import { listRecentProjects } from "../platform/project-storage";
import { requestDiscardDraftChoice } from "../stores/discard-draft-prompt";
import {
  ensureStartupProjectsDialogVisible,
  refreshStartupProjectsRecents,
  resolveStartupProjectsChoice,
  type StartupProjectsChoice,
  useStartupProjectsPromptStore,
} from "../stores/startup-projects-prompt";

function truncatePath(path: string, maxLength = 56): string {
  if (path.length <= maxLength) return path;
  const head = Math.max(20, Math.floor(maxLength * 0.35));
  const tail = maxLength - head - 1;
  return `${path.slice(0, head)}…${path.slice(-tail)}`;
}

export function StartupProjectsDialog() {
  const { t } = useTranslation();
  const open = useStartupProjectsPromptStore((s) => s.open);
  const draft = useStartupProjectsPromptStore((s) => s.draft);
  const recents = useStartupProjectsPromptStore((s) => s.recents);

  useEffect(() => {
    ensureStartupProjectsDialogVisible();
  }, []);

  const handleRemoveRecent = async (path: string) => {
    removeRecentProject(path);
    refreshStartupProjectsRecents(await listRecentProjects());
  };

  const tryChoice = async (choice: StartupProjectsChoice) => {
    if (draft && choice.type !== "restore-draft") {
      const confirmed = await requestDiscardDraftChoice(draft.name);
      if (!confirmed) return;
    }
    resolveStartupProjectsChoice(choice);
  };

  return (
    <Dialog
      open={open}
      onClose={() => void tryChoice({ type: "new-show" })}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{t("startup.title")}</DialogTitle>
      <DialogContent sx={{ px: 0, pt: 0 }}>
        {draft ? (
          <List
            subheader={<ListSubheader component="div">{t("startup.unsavedDraft")}</ListSubheader>}
          >
            <ListItemButton onClick={() => void tryChoice({ type: "restore-draft" })}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <EditNoteOutlinedIcon fontSize="small" color="warning" />
              </ListItemIcon>
              <ListItemText primary={draft.name} secondary={t("startup.restoreDraftHint")} />
            </ListItemButton>
          </List>
        ) : null}

        {recents.length > 0 ? (
          <List
            subheader={<ListSubheader component="div">{t("startup.recentProjects")}</ListSubheader>}
          >
            {recents.map((entry) => (
              <ListItem
                key={entry.path}
                disablePadding
                sx={{
                  "@media (hover: hover)": {
                    "& .MuiListItemSecondaryAction-root": {
                      opacity: 0,
                      transition: "opacity 0.15s ease",
                    },
                    "&:hover .MuiListItemSecondaryAction-root, &:focus-within .MuiListItemSecondaryAction-root":
                      {
                        opacity: 1,
                      },
                  },
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label={t("startup.removeRecentProject", { projectName: entry.name })}
                    onClick={() => void handleRemoveRecent(entry.path)}
                  >
                    <CloseOutlinedIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton
                  onClick={() => void tryChoice({ type: "open-recent", path: entry.path })}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <HistoryOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={entry.name} secondary={truncatePath(entry.path)} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        ) : null}

        {!draft && recents.length === 0 ? (
          <Typography sx={{ px: 3, py: 1, fontSize: 14, color: "text.secondary" }}>
            {t("startup.description")}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => void tryChoice({ type: "new-show" })}>{t("startup.newShow")}</Button>
        <Button
          variant="contained"
          startIcon={<FolderOpenOutlinedIcon />}
          onClick={() => void tryChoice({ type: "browse" })}
        >
          {t("common.action.browse")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
