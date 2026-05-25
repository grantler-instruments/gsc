import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatShortcut } from "../lib/keyboard";
import { notify, notifyWarning } from "../lib/notifications";
import { openSettings } from "../lib/open-settings";
import {
  openProjectFile,
  openRecentProjectPath,
  saveProjectFile,
} from "../lib/project-file-actions";
import { BUNDLE_EXTENSION } from "../lib/project-paths";
import type { RecentProjectEntry } from "../lib/recent-projects";
import { getPlatform } from "../platform";
import { exportProjectBundle, listRecentProjects } from "../platform/project-storage";
import { usePreferencesStore } from "../stores/preferences";
import { projectDisplayName, useProjectLocationStore } from "../stores/project-location";
import { useUiStore } from "../stores/ui";

const isTauri = getPlatform() === "tauri";

function truncatePath(path: string, maxLength = 48): string {
  if (path.length <= maxLength) return path;
  const head = Math.max(16, Math.floor(maxLength * 0.35));
  const tail = maxLength - head - 1;
  return `${path.slice(0, head)}…${path.slice(-tail)}`;
}

export function BrandFileMenu() {
  const { t } = useTranslation();
  const rootDir = useProjectLocationStore((s) => s.rootDir);
  const isTemporaryRoot = useProjectLocationStore((s) => s.isTemporaryRoot);
  const showMode = useUiStore((s) => s.showMode);
  const hasSeenFileMenuHint = usePreferencesStore((s) => s.hasSeenFileMenuHint);
  const markFileMenuHintSeen = usePreferencesStore((s) => s.markFileMenuHintSeen);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [recents, setRecents] = useState<RecentProjectEntry[]>([]);
  const open = Boolean(anchorEl);

  useEffect(() => {
    if (!open || !isTauri) return;
    void listRecentProjects().then(setRecents);
  }, [open]);

  useEffect(() => {
    if (hasSeenFileMenuHint) return;
    const id = window.setTimeout(() => {
      notify(t("fileMenu.firstVisitHint"), "info");
      markFileMenuHintSeen();
    }, 800);
    return () => clearTimeout(id);
  }, [hasSeenFileMenuHint, markFileMenuHintSeen, t]);

  const openMenu = (target: HTMLElement) => {
    markFileMenuHintSeen();
    setAnchorEl(target);
  };

  const close = () => setAnchorEl(null);

  const handleExport = async () => {
    close();
    const { missing } = await exportProjectBundle();
    if (missing.length > 0) {
      notifyWarning(t("notification.exportMissingAssets", { count: missing.length }));
    }
  };

  const projectFolderLabel = projectDisplayName(rootDir);
  const saveLocationHint =
    isTauri && isTemporaryRoot
      ? t("project.draftHint")
      : projectFolderLabel
        ? t("project.savingToHint", { folder: projectFolderLabel })
        : "";
  const saveShortcut = formatShortcut("S");

  return (
    <>
      <Tooltip title={t("fileMenu.tooltip")} arrow>
        <ButtonBase
          onClick={(e) => openMenu(e.currentTarget)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t("fileMenu.ariaLabel")}
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
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.125,
            }}
          >
            {t("common.brand.gsc")}
            <ArrowDropDownIcon
              sx={{
                fontSize: 18,
                opacity: 0.85,
                transform: open ? "rotate(180deg)" : "none",
                transition: "transform 0.15s ease",
              }}
            />
          </Box>
        </ButtonBase>
      </Tooltip>

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
          <ListItemText primary={t("fileMenu.settings")} secondary={formatShortcut(",")} />
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
            primary={t("fileMenu.open")}
            secondary={
              showMode
                ? t("common.state.disabledInShowMode")
                : isTauri
                  ? `${formatShortcut("O")}${saveLocationHint}`
                  : `${formatShortcut("O")} · ${t("fileMenu.openWebHint", { extension: BUNDLE_EXTENSION })}`
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
              primary={t("fileMenu.save")}
              secondary={
                showMode
                  ? t("common.state.disabledInShowMode")
                  : isTemporaryRoot
                    ? `${saveShortcut} · ${t("fileMenu.saveChooseLocation")}`
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
            primary={t("fileMenu.export")}
            secondary={
              showMode
                ? t("common.state.disabledInShowMode")
                : isTauri
                  ? t("fileMenu.exportHint", { extension: BUNDLE_EXTENSION })
                  : `${saveShortcut} · ${t("fileMenu.exportHint", { extension: BUNDLE_EXTENSION })}`
            }
          />
        </MenuItem>
      </Menu>
    </>
  );
}
