import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import ContentCutOutlinedIcon from "@mui/icons-material/ContentCutOutlined";
import ControlPointDuplicateOutlinedIcon from "@mui/icons-material/ControlPointDuplicateOutlined";
import DriveFileRenameOutlineOutlinedIcon from "@mui/icons-material/DriveFileRenameOutlineOutlined";
import LayersClearOutlinedIcon from "@mui/icons-material/LayersClearOutlined";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { formatShortcut } from "../lib/keyboard";

export interface CueContextMenuState {
  mouseX: number;
  mouseY: number;
  cueId: string;
}

interface CueContextMenuProps {
  menu: CueContextMenuState | null;
  canRename: boolean;
  canUngroup: boolean;
  onClose: () => void;
  onCopy: () => void;
  onCut: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onUngroup: () => void;
}

function Shortcut({ label }: { label: string }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
      {label}
    </Typography>
  );
}

export function CueContextMenu({
  menu,
  canRename,
  canUngroup,
  onClose,
  onCopy,
  onCut,
  onDuplicate,
  onRename,
  onUngroup,
}: CueContextMenuProps) {
  const { t } = useTranslation();

  return (
    <Menu
      open={menu !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={menu ? { top: menu.mouseY, left: menu.mouseX } : undefined}
    >
      <MenuItem
        onClick={() => {
          onCopy();
          onClose();
        }}
      >
        <ListItemIcon>
          <ContentCopyOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t("common.action.copy")}</ListItemText>
        <Shortcut label={formatShortcut("c")} />
      </MenuItem>
      <MenuItem
        onClick={() => {
          onCut();
          onClose();
        }}
      >
        <ListItemIcon>
          <ContentCutOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t("common.action.cut")}</ListItemText>
        <Shortcut label={formatShortcut("x")} />
      </MenuItem>
      <MenuItem
        onClick={() => {
          onDuplicate();
          onClose();
        }}
      >
        <ListItemIcon>
          <ControlPointDuplicateOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t("common.action.duplicate")}</ListItemText>
        <Shortcut label={formatShortcut("d")} />
      </MenuItem>
      <MenuItem
        disabled={!canRename}
        onClick={() => {
          onRename();
          onClose();
        }}
      >
        <ListItemIcon>
          <DriveFileRenameOutlineOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t("common.action.rename")}</ListItemText>
      </MenuItem>
      {canUngroup ? (
        <MenuItem
          onClick={() => {
            onUngroup();
            onClose();
          }}
        >
          <ListItemIcon>
            <LayersClearOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("inspector.ungroupContainer")}</ListItemText>
        </MenuItem>
      ) : null}
    </Menu>
  );
}
