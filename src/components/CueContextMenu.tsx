import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import ControlPointDuplicateOutlinedIcon from "@mui/icons-material/ControlPointDuplicateOutlined";
import DriveFileRenameOutlineOutlinedIcon from "@mui/icons-material/DriveFileRenameOutlineOutlined";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { formatShortcut } from "../lib/keyboard";

export interface CueContextMenuState {
  mouseX: number;
  mouseY: number;
  cueId: string;
}

interface CueContextMenuProps {
  menu: CueContextMenuState | null;
  canRename: boolean;
  onClose: () => void;
  onCopy: () => void;
  onDuplicate: () => void;
  onRename: () => void;
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
  onClose,
  onCopy,
  onDuplicate,
  onRename,
}: CueContextMenuProps) {
  return (
    <Menu
      open={menu !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={
        menu ? { top: menu.mouseY, left: menu.mouseX } : undefined
      }
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
        <ListItemText>Copy</ListItemText>
        <Shortcut label={formatShortcut("c")} />
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
        <ListItemText>Duplicate</ListItemText>
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
        <ListItemText>Rename</ListItemText>
      </MenuItem>
    </Menu>
  );
}
