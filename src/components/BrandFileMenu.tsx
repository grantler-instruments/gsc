import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ButtonBase from "@mui/material/ButtonBase";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useRef, useState } from "react";
import { notifyWarning } from "../lib/notifications";
import { openProjectSnapshot } from "../lib/open-project";
import { openSettings } from "../lib/open-settings";
import { downloadProject, parseProjectFile } from "../lib/project-io";
import { BUNDLE_EXTENSION } from "../lib/project-paths";
import { getPlatform } from "../platform";
import { exportProjectBundle, importProjectBundle, openProject } from "../platform/project-storage";
import { useProjectStore } from "../stores/project";
import { projectDisplayName, useProjectLocationStore } from "../stores/project-location";
import { useUiStore } from "../stores/ui";

const isTauri = getPlatform() === "tauri";

export function BrandFileMenu() {
  const getSnapshot = useProjectStore((s) => s.getSnapshot);
  const rootDir = useProjectLocationStore((s) => s.rootDir);
  const showMode = useUiStore((s) => s.showMode);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const bundleRef = useRef<HTMLInputElement>(null);
  const open = Boolean(anchorEl);

  const close = () => setAnchorEl(null);

  const handleSaveJson = () => {
    downloadProject(getSnapshot());
    close();
  };

  const handleExportBundle = async () => {
    close();
    const { missing } = await exportProjectBundle();
    if (missing.length > 0) {
      notifyWarning(`Exported, but ${missing.length} asset(s) were missing from storage.`);
    }
  };

  const projectFolderLabel = projectDisplayName(rootDir);

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
          <ListItemText primary="Settings…" secondary="⌘," />
        </MenuItem>

        {isTauri ? (
          <MenuItem
            disabled={showMode}
            onClick={() => {
              close();
              void openProject();
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
                  : projectFolderLabel
                    ? `Saving to ${projectFolderLabel}`
                    : "Saves automatically to the project folder"
              }
            />
          </MenuItem>
        ) : (
          <MenuItem
            disabled={showMode}
            onClick={() => {
              close();
              jsonRef.current?.click();
            }}
          >
            <ListItemIcon>
              <FolderOpenOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Open project (JSON)…"
              secondary={showMode ? "Disabled in show mode" : undefined}
            />
          </MenuItem>
        )}

        {!isTauri ? (
          <MenuItem onClick={handleSaveJson}>
            <ListItemIcon>
              <SaveOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Save project (JSON)…" secondary="Cues only, no media files" />
          </MenuItem>
        ) : null}

        <MenuItem disabled={showMode} onClick={() => void handleExportBundle()}>
          <ListItemIcon>
            <ArchiveOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Export project bundle…"
            secondary={
              showMode ? "Disabled in show mode" : `Includes all assets (${BUNDLE_EXTENSION})`
            }
          />
        </MenuItem>

        {!isTauri ? (
          <MenuItem
            disabled={showMode}
            onClick={() => {
              close();
              bundleRef.current?.click();
            }}
          >
            <ListItemIcon>
              <ArchiveOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Import project bundle…"
              secondary={showMode ? "Disabled in show mode" : undefined}
            />
          </MenuItem>
        ) : null}
      </Menu>

      <input
        ref={jsonRef}
        type="file"
        accept=".gsc,application/json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          void openProjectSnapshot(parseProjectFile(text));
          e.target.value = "";
        }}
      />

      <input
        ref={bundleRef}
        type="file"
        accept=".zip,.gsc.zip,application/zip"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          await importProjectBundle(file);
          e.target.value = "";
        }}
      />
    </>
  );
}
