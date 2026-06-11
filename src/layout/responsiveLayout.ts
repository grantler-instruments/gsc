import type { SxProps, Theme } from "@mui/material/styles";
import { RIGHT_SIDEBAR_WIDTH } from "../types/right-sidebar";
import { SIDEBAR_WIDTH } from "../types/sidebar";

/** Viewports below this MUI breakpoint (xs + sm) use compact sidebar layout. */
export const compactLayoutBreakpoint = "md" as const;

export const compactSidebarShellSx: SxProps<Theme> = {
  width: { xs: "100%", [compactLayoutBreakpoint]: SIDEBAR_WIDTH },
  flex: { xs: 1, [compactLayoutBreakpoint]: "0 0 auto" },
  flexShrink: { xs: 1, [compactLayoutBreakpoint]: 0 },
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

export const compactInspectorDrawerPaperSx: SxProps<Theme> = {
  width: {
    xs: "100%",
    sm: RIGHT_SIDEBAR_WIDTH,
  },
  maxWidth: "100%",
  display: "flex",
  flexDirection: "column",
};
