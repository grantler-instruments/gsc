import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUiStore } from "../stores/ui";

interface AddFixtureMenuProps {
  /** Opens the dropdown above the button (for footer placement). */
  dropUp?: boolean;
  fullWidth?: boolean;
  onAddGeneric: () => void;
  onBrowseOfl: () => void;
  onExportProfile: () => void;
  onImportProfile: () => void;
}

export function AddFixtureMenu({
  dropUp = false,
  fullWidth = false,
  onAddGeneric,
  onBrowseOfl,
  onExportProfile,
  onImportProfile,
}: AddFixtureMenuProps) {
  const { t } = useTranslation();
  const showMode = useUiStore((s) => s.showMode);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const closeMenu = () => setAnchorEl(null);

  const handleAddGeneric = () => {
    onAddGeneric();
    closeMenu();
  };

  const handleBrowseOfl = () => {
    onBrowseOfl();
    closeMenu();
  };

  const handleExportProfile = () => {
    onExportProfile();
    closeMenu();
  };

  const handleImportProfile = () => {
    onImportProfile();
    closeMenu();
  };

  return (
    <Box sx={{ position: "relative", flex: fullWidth ? 1 : undefined }}>
      <Button
        variant="text"
        fullWidth={fullWidth}
        disabled={showMode}
        title={showMode ? t("common.state.disabledInShowMode") : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {t("fixtures.addMenu")}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        anchorOrigin={{
          vertical: dropUp ? "top" : "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: dropUp ? "bottom" : "top",
          horizontal: "left",
        }}
      >
        <MenuItem onClick={handleAddGeneric}>
          <ListItemIcon
            sx={{
              minWidth: 28,
              color: "primary.main",
              "& .MuiSvgIcon-root": { fontSize: 20, opacity: 0.9 },
            }}
          >
            <LightbulbOutlinedIcon />
          </ListItemIcon>
          {t("fixtures.genericFixture")}
        </MenuItem>
        <Divider />
        <ListSubheader
          disableSticky
          sx={{
            bgcolor: "background.paper",
            lineHeight: "32px",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "text.secondary",
          }}
        >
          {t("fixtures.library")}
        </ListSubheader>
        <MenuItem onClick={handleBrowseOfl}>
          <ListItemIcon
            sx={{
              minWidth: 28,
              color: "text.secondary",
              "& .MuiSvgIcon-root": { fontSize: 20, opacity: 0.9 },
            }}
          >
            <MenuBookOutlinedIcon />
          </ListItemIcon>
          {t("fixtures.browseOfl")}
        </MenuItem>
        <Divider />
        <ListSubheader
          disableSticky
          sx={{
            bgcolor: "background.paper",
            lineHeight: "32px",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "text.secondary",
          }}
        >
          {t("fixtures.profile")}
        </ListSubheader>
        <MenuItem onClick={handleExportProfile}>
          <ListItemIcon
            sx={{
              minWidth: 28,
              color: "text.secondary",
              "& .MuiSvgIcon-root": { fontSize: 20, opacity: 0.9 },
            }}
          >
            <FileDownloadOutlinedIcon />
          </ListItemIcon>
          {t("fixtures.exportProfile")}
        </MenuItem>
        <MenuItem onClick={handleImportProfile}>
          <ListItemIcon
            sx={{
              minWidth: 28,
              color: "text.secondary",
              "& .MuiSvgIcon-root": { fontSize: 20, opacity: 0.9 },
            }}
          >
            <FileUploadOutlinedIcon />
          </ListItemIcon>
          {t("fixtures.importProfile")}
        </MenuItem>
      </Menu>
    </Box>
  );
}
