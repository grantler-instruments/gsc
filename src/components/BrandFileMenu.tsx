import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useRef, useState } from "react";
import { downloadProject, parseProjectFile } from "../lib/project-io";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";

export function BrandFileMenu() {
  const getSnapshot = useProjectStore((s) => s.getSnapshot);
  const loadSnapshot = useProjectStore((s) => s.loadSnapshot);
  const showMode = useUiStore((s) => s.showMode);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const open = Boolean(anchorEl);

  const close = () => setAnchorEl(null);

  const handleSave = () => {
    downloadProject(getSnapshot());
    close();
  };

  const handleOpenClick = () => {
    close();
    fileRef.current?.click();
  };

  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="File menu"
        sx={{
          display: "flex",
          alignItems: "baseline",
          gap: 1,
          flexShrink: 0,
          borderRadius: 1,
          px: 1,
          py: 0.5,
          textAlign: "left",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Box
          component="span"
          sx={{ fontWeight: 600, fontSize: 13, letterSpacing: "0.02em" }}
        >
          Grantler Stage Control
        </Box>
        <Box
          component="span"
          sx={{ fontSize: 11, color: "primary.main", fontWeight: 700 }}
        >
          GSC
        </Box>
      </ButtonBase>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <MenuItem onClick={handleSave}>
          <ListItemIcon>
            <SaveOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Save project…</ListItemText>
        </MenuItem>
        <MenuItem
          disabled={showMode}
          onClick={handleOpenClick}
          title={showMode ? "Disabled in show mode" : undefined}
        >
          <ListItemIcon>
            <FolderOpenOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Open project…"
            secondary={showMode ? "Disabled in show mode" : undefined}
          />
        </MenuItem>
      </Menu>

      <input
        ref={fileRef}
        type="file"
        accept=".gsc,application/json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          loadSnapshot(parseProjectFile(text));
          e.target.value = "";
        }}
      />
    </>
  );
}
