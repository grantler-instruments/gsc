import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
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
import { useTranslation } from "react-i18next";
import { formatProjectTimestamp } from "../lib/format-project-timestamp";
import { deleteStoredProjectFile } from "../lib/project-file-actions";
import type { IdbProjectSummary } from "../lib/project-idb";
import { BUNDLE_EXTENSION } from "../lib/project-paths";
import { listStoredWebProjects } from "../platform/project-storage";
import {
  refreshWebOpenProjectsList,
  resolveWebOpenProjectsChoice,
  useWebOpenProjectsPromptStore,
} from "../stores/web-open-projects-prompt";

export function WebOpenProjectsDialog() {
  const { t, i18n } = useTranslation();
  const open = useWebOpenProjectsPromptStore((s) => s.open);
  const projects = useWebOpenProjectsPromptStore((s) => s.projects);

  const handleDelete = async (project: IdbProjectSummary) => {
    const deleted = await deleteStoredProjectFile(project.id, project.name);
    if (!deleted) return;
    refreshWebOpenProjectsList(await listStoredWebProjects());
  };

  return (
    <Dialog
      open={open}
      onClose={() => resolveWebOpenProjectsChoice({ type: "cancel" })}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{t("fileMenu.open")}</DialogTitle>
      <DialogContent sx={{ px: 0, pt: 0 }}>
        {projects.length > 0 ? (
          <List
            subheader={
              <ListSubheader component="div">{t("fileMenu.storedProjects")}</ListSubheader>
            }
          >
            {projects.map((project) => (
              <ListItem
                key={project.id}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label={t("fileMenu.deleteStoredProject", { projectName: project.name })}
                    onClick={() => void handleDelete(project)}
                  >
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton
                  onClick={() =>
                    resolveWebOpenProjectsChoice({ type: "open-stored", projectId: project.id })
                  }
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <HistoryOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={project.name}
                    secondary={t("fileMenu.lastOpened", {
                      timestamp: formatProjectTimestamp(project.openedAt, i18n.language),
                    })}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography sx={{ px: 3, py: 1, fontSize: 14, color: "text.secondary" }}>
            {t("fileMenu.openWebEmpty", { extension: BUNDLE_EXTENSION })}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => resolveWebOpenProjectsChoice({ type: "cancel" })}>
          {t("common.action.cancel")}
        </Button>
        <Button
          variant="contained"
          startIcon={<FileUploadOutlinedIcon />}
          onClick={() => resolveWebOpenProjectsChoice({ type: "import" })}
        >
          {t("common.action.import")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
