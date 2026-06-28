import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import ContentCutOutlinedIcon from "@mui/icons-material/ContentCutOutlined";
import ContentPasteOutlinedIcon from "@mui/icons-material/ContentPasteOutlined";
import ControlPointDuplicateOutlinedIcon from "@mui/icons-material/ControlPointDuplicateOutlined";
import DriveFileRenameOutlineOutlinedIcon from "@mui/icons-material/DriveFileRenameOutlineOutlined";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useTranslation } from "react-i18next";

export interface CueListTabContextMenuState {
  mouseX: number;
  mouseY: number;
  listId: string;
}

interface CueListTabContextMenuProps {
  menu: CueListTabContextMenuState | null;
  canCut: boolean;
  canPaste: boolean;
  onClose: () => void;
  onRename: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
}

export function CueListTabContextMenu({
  menu,
  canCut,
  canPaste,
  onClose,
  onRename,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
}: CueListTabContextMenuProps) {
  const { t } = useTranslation();

  const run = (action: () => void) => () => {
    action();
    onClose();
  };

  return (
    <Menu
      open={menu !== null}
      onClose={onClose}
      aria-label={t("cueList.tabContextMenuAria")}
      anchorReference="anchorPosition"
      anchorPosition={menu ? { top: menu.mouseY, left: menu.mouseX } : undefined}
    >
      <MenuItem onClick={run(onRename)}>
        <ListItemIcon>
          <DriveFileRenameOutlineOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t("common.action.rename")}</ListItemText>
      </MenuItem>
      <Divider />
      <MenuItem onClick={run(onCopy)}>
        <ListItemIcon>
          <ContentCopyOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t("common.action.copy")}</ListItemText>
      </MenuItem>
      <MenuItem disabled={!canCut} onClick={run(onCut)}>
        <ListItemIcon>
          <ContentCutOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t("common.action.cut")}</ListItemText>
      </MenuItem>
      <MenuItem disabled={!canPaste} onClick={run(onPaste)}>
        <ListItemIcon>
          <ContentPasteOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t("common.action.paste")}</ListItemText>
      </MenuItem>
      <MenuItem onClick={run(onDuplicate)}>
        <ListItemIcon>
          <ControlPointDuplicateOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t("common.action.duplicate")}</ListItemText>
      </MenuItem>
    </Menu>
  );
}
