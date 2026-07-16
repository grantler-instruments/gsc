import CloseIcon from "@mui/icons-material/Close";
import HorizontalSplitIcon from "@mui/icons-material/HorizontalSplit";
import VerticalSplitIcon from "@mui/icons-material/VerticalSplit";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { useTranslation } from "react-i18next";
import { cueListScrollRegionSx, hotCuePanelShellSx } from "../../layout/responsiveLayout";
import { useActiveHotCueList, useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import { AddCueMenu } from "../AddCueMenu";
import { CueListTabs } from "../CueListTabs";
import { HotCueGrid } from "./HotCueGrid";

/**
 * Always-visible hot-cue cart shown beside (or below) the main cue list. Hot
 * lists live only here; firing happens via overlay so the main list is untouched.
 */
export function HotCuePanel() {
  const { t } = useTranslation();
  const orientation = useUiStore((s) => s.hotCuePanelOrientation);
  const toggleOrientation = useUiStore((s) => s.toggleHotCuePanelOrientation);
  const setHotCuePanelVisible = useUiStore((s) => s.setHotCuePanelVisible);
  const showMode = useUiStore((s) => s.showMode);
  const hotList = useActiveHotCueList();
  const activeCueListId = useProjectStore((s) => s.activeCueListId);
  const setActiveCueList = useProjectStore((s) => s.setActiveCueList);

  const isRight = orientation === "right";

  const closeButton = (
    <IconButton
      size="small"
      onClick={() => setHotCuePanelVisible(false)}
      title={t("hotCues.hidePanel")}
      aria-label={t("hotCues.hidePanelAria")}
      sx={{ color: "text.secondary" }}
    >
      <CloseIcon sx={{ fontSize: 16 }} />
    </IconButton>
  );

  const orientationToggle = (
    <IconButton
      size="small"
      onClick={toggleOrientation}
      title={isRight ? t("hotCues.moveBelow") : t("hotCues.moveRight")}
      aria-label={isRight ? t("hotCues.moveBelow") : t("hotCues.moveRight")}
      sx={{ color: "text.secondary" }}
    >
      {isRight ? (
        <HorizontalSplitIcon sx={{ fontSize: 16 }} />
      ) : (
        <VerticalSplitIcon sx={{ fontSize: 16 }} />
      )}
    </IconButton>
  );

  return (
    <Box
      component="aside"
      aria-label={t("hotCues.panelAria")}
      onPointerDownCapture={
        hotList && activeCueListId !== hotList.id ? () => setActiveCueList(hotList.id) : undefined
      }
      sx={hotCuePanelShellSx(orientation)}
    >
      <CueListTabs
        kind="hot"
        activeListId={hotList?.id}
        trailing={
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {orientationToggle}
            {closeButton}
          </Box>
        }
      />
      {hotList ? (
        <Box sx={cueListScrollRegionSx}>
          <HotCueGrid listId={hotList.id} />
        </Box>
      ) : (
        <Box
          sx={{
            ...cueListScrollRegionSx,
            alignItems: "center",
            justifyContent: "center",
            p: 3,
            color: "text.secondary",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          {showMode ? t("hotCues.empty") : t("hotCues.noLists")}
        </Box>
      )}

      {!showMode && hotList && (
        <Box
          component="footer"
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1.5,
            py: 1,
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
            bgcolor: "background.default",
          }}
        >
          <AddCueMenu dropUp fullWidth />
        </Box>
      )}
    </Box>
  );
}
