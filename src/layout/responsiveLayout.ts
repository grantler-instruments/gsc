import type { SxProps, Theme } from "@mui/material/styles";
import { RIGHT_SIDEBAR_WIDTH } from "../types/right-sidebar";
import { SIDEBAR_WIDTH } from "../types/sidebar";

/** Viewports below this MUI breakpoint (xs + sm) use compact sidebar layout. */
export const compactLayoutBreakpoint = "md" as const;

/** Panel edge stroke using design tokens (avoids MUI border shorthand color bugs). */
export const panelEdgeBorder = "1px solid var(--border)";

export const compactSidebarShellSx: SxProps<Theme> = {
  width: { xs: "100%", [compactLayoutBreakpoint]: SIDEBAR_WIDTH },
  flex: { xs: 1, [compactLayoutBreakpoint]: "0 0 auto" },
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  bgcolor: "background.paper",
  minHeight: 0,
  minWidth: 0,
};

export const compactSidebarTabLabelSx: SxProps<Theme> = {
  display: { xs: "none", sm: "inline" },
};

export function sidebarTabsSx(compact: boolean): SxProps<Theme> {
  return (theme) => ({
    flexShrink: 0,
    ...(compact
      ? {
          "& .MuiTab-root": {
            minWidth: {
              xs: theme.spacing(9),
              sm: theme.spacing(11.25),
              [compactLayoutBreakpoint]: "auto",
            },
          },
        }
      : {}),
  });
}

/** Desktop cue list + hot-cue split workspace (fills remaining main area). */
export const cueWorkspaceShellSx: SxProps<Theme> = {
  flex: 1,
  display: "flex",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
};

export function cueWorkspaceSplitSx(orientation: "right" | "bottom"): SxProps<Theme> {
  return {
    ...cueWorkspaceShellSx,
    flexDirection: orientation === "bottom" ? "column" : "row",
  };
}

/** Main sequence list panel inside the split workspace. */
export const cueWorkspaceMainPanelSx: SxProps<Theme> = {
  flex: "1 1 0",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
};

const HOT_PANEL_WIDTH = 340;
const HOT_PANEL_HEIGHT = 260;

/** Hot-cue cart panel — preferred size with flex shrink when space is tight. */
export function hotCuePanelShellSx(orientation: "right" | "bottom"): SxProps<Theme> {
  return {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    flexShrink: 1,
    bgcolor: "background.default",
    ...(orientation === "right"
      ? {
          flex: `0 1 ${HOT_PANEL_WIDTH}px`,
          width: HOT_PANEL_WIDTH,
          maxWidth: "40%",
          minWidth: 200,
          minHeight: 0,
          borderLeft: panelEdgeBorder,
        }
      : {
          flex: `0 1 ${HOT_PANEL_HEIGHT}px`,
          maxHeight: "45%",
          minHeight: 120,
          minWidth: 0,
          borderTop: panelEdgeBorder,
        }),
  };
}

/** Scrollable body inside a cue list section (between tabs and footer). */
export const cueListScrollRegionSx: SxProps<Theme> = {
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

export const compactInspectorDrawerPaperSx: SxProps<Theme> = {
  width: {
    xs: "100%",
    sm: RIGHT_SIDEBAR_WIDTH,
  },
  maxWidth: "100%",
  display: "flex",
  flexDirection: "column",
};
