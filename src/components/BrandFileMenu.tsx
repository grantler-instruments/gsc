import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ButtonBase from "@mui/material/ButtonBase";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useEffect, useState } from "react";
import { formatShortcut } from "../lib/keyboard";
import { openSettings } from "../lib/open-settings";
import { openProjectFile, openRecentProjectPath, saveProjectFile } from "../lib/project-file-actions";
import type { RecentProjectEntry } from "../lib/recent-projects";
import { BUNDLE_EXTENSION } from "../lib/project-paths";
import { getPlatform } from "../platform";
import { exportProjectBundle, listRecentProjects } from "../platform/project-storage";
import { projectDisplayName, useProjectLocationStore } from "../stores/project-location";
import { useUiStore } from "../stores/ui";
import { notifyWarning } from "../lib/notifications";

const isTauri = getPlatform() === "tauri";

function truncatePath(path: string, maxLength = 48): string {
  if (path.length <= maxLength) return path;
  const head = Math.max(16, Math.floor(maxLength * 0.35));
  const tail = maxLength - head - 1;
  return `${path.slice(0, head)}…${path.slice(-tail)}`;
}

export function BrandFileMenu() {
  const rootDir = useProjectLocationStore((s) => s.rootDir);
  const isTemporaryRoot = useProjectLocationStore((s) => s.isTemporaryRoot);
  const showMode = useUiStore((s) => s.showMode);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [recents, setRecents] = useState<RecentProjectEntry[]>([]);
  const open = Boolean(anchorEl);

  useEffect(() => {
    if (!open || !isTauri) return;
    void listRecentProjects().then(setRecents);
  }, [open]);

  const close = () => setAnchorEl(null);

  const handleExport = async () => {
    close();
    const { missing } = await exportProjectBundle();
    if (missing.length > 0) {
      notifyWarning(`Exported, but ${missing.length} asset(s) were missing from storage.`);
    }
  };

  const projectFolderLabel = projectDisplayName(rootDir);
  const saveLocationHint =
    isTauri && isTemporaryRoot
      ? " · Draft (save to choose location)"
      : projectFolderLabel
        ? ` · Saving to ${projectFolderLabel}`
        : "";
  const saveShortcut = formatShortcut("S");

  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="File menu"
        sx={{
          flexShrink: 0,
          borderRadius: 1,
          px: 1,
          py: 0.5,
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.06em",
          color: "primary.main",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        GSC
      </ButtonBase>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <MenuItem
          onClick={() => {
            close();
            openSettings();
          }}
        >
          <ListItemIcon>
            <SettingsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Settings…" secondary={formatShortcut(",")} />
        </MenuItem>

        <MenuItem
          disabled={showMode}
          onClick={() => {
            close();
            void openProjectFile();
          }}
        >
          <ListItemIcon>
            <FolderOpenOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Open…"
            secondary={
              showMode
                ? "Disabled in show mode"
                : isTauri
                  ? `${formatShortcut("O")}${saveLocationHint}`
                  : `${formatShortcut("O")} · Import a ${BUNDLE_EXTENSION} file`
            }
          />
        </MenuItem>

        {isTauri && recents.length > 0 ? <Divider key="recent-divider" /> : null}

        {isTauri
          ? recents.map((entry) => (
              <MenuItem
                key={entry.path}
                disabled={showMode}
                onClick={() => {
                  close();
                  void openRecentProjectPath(entry.path);
                }}
              >
                <ListItemIcon>
                  <HistoryOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={entry.name} secondary={truncatePath(entry.path)} />
              </MenuItem>
            ))
          : null}

        {isTauri ? (
          <MenuItem
            disabled={showMode}
            onClick={() => {
              close();
              void saveProjectFile();
            }}
          >
            <ListItemIcon>
              <ArchiveOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Save"
              secondary={
                showMode
                  ? "Disabled in show mode"
                  : isTemporaryRoot
                    ? `${saveShortcut} · Choose location…`
                    : saveShortcut
              }
            />
          </MenuItem>
        ) : null}

        <MenuItem disabled={showMode} onClick={() => void handleExport()}>
          <ListItemIcon>
            <ArchiveOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Export…"
            secondary={
              showMode
                ? "Disabled in show mode"
                : isTauri
                  ? `Download ${BUNDLE_EXTENSION} with all assets`
                  : `${saveShortcut} · Download ${BUNDLE_EXTENSION} with all assets`
            }
          />
        </MenuItem>
      </Menu>
    </>
  );
}
