import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { compactInspectorDrawerPaperSx } from "../layout/responsiveLayout";
import { getPrimarySelectedCueId } from "../lib/cue-selection";
import { useActiveCueList, useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import { CueInspector } from "./CueInspector";
import { RightSidebar } from "./RightSidebar";

const drawerContentSx = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  "& > aside": {
    width: "100%",
    maxWidth: "100%",
    flex: 1,
    borderLeft: "none",
    minHeight: 0,
  },
} as const;

export function CompactInspectorDrawer() {
  const { t } = useTranslation();
  const showMode = useUiStore((s) => s.showMode);
  const dismissed = useUiStore((s) => s.compactInspectorDrawerDismissed);
  const setDismissed = useUiStore((s) => s.setCompactInspectorDrawerDismissed);
  const setCompactInspectorDrawerOpen = useUiStore((s) => s.setCompactInspectorDrawerOpen);
  const fixtures = useProjectStore((s) => s.fixtures);
  const selectedCueIds = useActiveCueList().selectedCueIds;
  const selectedCueId = getPrimarySelectedCueId(selectedCueIds);
  const hasFixtures = fixtures.length > 0;
  const hasSelectedCue = selectedCueId !== null;
  const inspectorAvailable = !showMode && hasSelectedCue;
  const open = inspectorAvailable && !dismissed;

  useEffect(() => {
    setCompactInspectorDrawerOpen(open);
    return () => setCompactInspectorDrawerOpen(false);
  }, [open, setCompactInspectorDrawerOpen]);

  if (!inspectorAvailable) {
    return null;
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => setDismissed(true)}
      slotProps={{
        paper: {
          sx: compactInspectorDrawerPaperSx,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 0.5,
          py: 0.75,
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <IconButton
          size="small"
          onClick={() => setDismissed(true)}
          aria-label={t("common.action.close")}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <Typography component="h2" variant="subtitle2" sx={{ flex: 1, m: 0 }}>
          {t("sidebar.inspector")}
        </Typography>
      </Box>

      <Box sx={drawerContentSx}>
        {hasFixtures ? <RightSidebar /> : hasSelectedCue ? <CueInspector /> : null}
      </Box>
    </Drawer>
  );
}
