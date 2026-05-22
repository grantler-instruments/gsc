import type { SxProps, Theme } from "@mui/material/styles";
import type { AssetKind, CueType } from "../types/cue";
import type { GscTokenSet } from "./tokens";

export const cueListEmptySx = {
  py: 2,
  px: 1.5,
  color: "text.secondary",
  fontSize: 13,
} as const;

export const CUE_TYPE_COLORS: Record<
  CueType | AssetKind,
  { color: string; bgcolor: string }
> = {
  audio: { color: "#6fcf97", bgcolor: "#1e3a2f" },
  video: { color: "#a78bfa", bgcolor: "#2a2540" },
  image: { color: "#e8b86d", bgcolor: "#3a2e1e" },
  midi: { color: "#7eb8da", bgcolor: "#1e2a3a" },
  osc: { color: "#8ad4c4", bgcolor: "#1e3a34" },
  group: { color: "#c9a227", bgcolor: "#2a2818" },
  sequence: { color: "#9eb8ff", bgcolor: "#1e2438" },
  stop: { color: "#e88a8a", bgcolor: "#3a1e1e" },
  wait: { color: "#e8c86d", bgcolor: "#3a3218" },
  volumeFade: { color: "#8ac4e8", bgcolor: "#1e2e3a" },
  opacityFade: { color: "#c4a8e8", bgcolor: "#2a1e3a" },
};

export const ADD_CUE_ICON_COLORS: Partial<Record<CueType, string>> = {
  midi: "#7eb8da",
  osc: "#8ad4c4",
  audio: "#6fcf97",
  video: "#a78bfa",
  image: "#e8b86d",
  group: "#c9a227",
  sequence: "#9eb8ff",
  wait: "#e8c86d",
  volumeFade: "#8ac4e8",
  opacityFade: "#c4a8e8",
};

const CUE_NAME_TINT = {
  stop: "#e8b4b4",
  wait: "#e8d4a8",
  volumeFade: "#b4d4e8",
  opacityFade: "#d4b4e8",
  warning: "#e8a87c",
} as const;

export function cueTypeBadgeSx(
  type: CueType | AssetKind,
  compact = false,
): SxProps<Theme> {
  const palette = CUE_TYPE_COLORS[type];
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 0.5,
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: 600,
    letterSpacing: "0.04em",
    flexShrink: 0,
    p: compact ? 0.5 : "2px 6px",
    borderRadius: 0.75,
    lineHeight: 1,
    color: palette.color,
    bgcolor: palette.bgcolor,
    "& .MuiSvgIcon-root": {
      fontSize: 16,
      width: "1em",
      height: "1em",
    },
  };
}

export interface CueRowStyleState {
  tokens: GscTokenSet;
  selected: boolean;
  primarySelected: boolean;
  active: boolean;
  isGroup: boolean;
  isSequence: boolean;
  isStop: boolean;
  isVolumeFade: boolean;
  isOpacityFade: boolean;
  isSequenceStep: boolean;
  hasWarning: boolean;
  pulseAsStopTarget: boolean;
  staticAsStopTarget: boolean;
  dropActive: boolean;
  insertBefore: boolean;
  insertAfter: boolean;
}

export function cueRowSx(state: CueRowStyleState): SxProps<Theme> {
  const { tokens } = state;
  const isHighlightSelected = state.selected || state.primarySelected;

  let bgcolor: string | undefined;
  let boxShadow: string | undefined;

  if (state.active && state.primarySelected) {
    bgcolor = `color-mix(in srgb, ${tokens.rowActive} 55%, ${tokens.rowPrimarySelected})`;
    boxShadow = `inset 4px 0 0 ${tokens.accent}, inset 0 0 0 1px color-mix(in srgb, ${tokens.success} 45%, transparent)`;
  } else if (state.active && state.selected) {
    bgcolor = `color-mix(in srgb, ${tokens.rowActive} 55%, ${tokens.rowSelected})`;
    boxShadow = `inset 4px 0 0 ${tokens.accent}, inset 0 0 0 1px color-mix(in srgb, ${tokens.success} 45%, transparent)`;
  } else if (state.active) {
    bgcolor = tokens.rowActive;
    boxShadow = `inset 3px 0 0 ${tokens.success}`;
  } else if (state.primarySelected) {
    bgcolor = tokens.rowPrimarySelected;
    boxShadow = `inset 4px 0 0 ${tokens.accent}, inset 0 0 0 1px color-mix(in srgb, ${tokens.accent} 28%, transparent)`;
  } else if (state.selected) {
    bgcolor = tokens.rowSelected;
    boxShadow = `inset 4px 0 0 ${tokens.accent}`;
  }

  if (state.dropActive) {
    bgcolor = "rgba(201, 162, 39, 0.12)";
    boxShadow = `inset 0 0 0 2px ${tokens.accent}`;
  }
  if (state.insertBefore) {
    boxShadow = `inset 0 2px 0 ${tokens.accent}`;
  }
  if (state.insertAfter) {
    boxShadow = `inset 0 -2px 0 ${tokens.accent}`;
  }

  return {
    display: "flex",
    alignItems: "center",
    gap: 1.25,
    py: 1,
    pr: 1.5,
    borderBottom: 1,
    borderColor: "divider",
    cursor: "pointer",
    listStyle: "none",
    ...(bgcolor && { bgcolor }),
    ...(boxShadow && { boxShadow }),
    ...(!isHighlightSelected && {
      "&:hover": { bgcolor: tokens.bgHover },
    }),
    ...(isHighlightSelected && {
      "&:hover": { filter: "brightness(1.06)" },
    }),
    ...(state.isGroup && { fontWeight: 500 }),
    ...(state.isSequenceStep && {
      boxShadow: `inset 3px 0 0 #9eb8ff`,
    }),
    ...(state.pulseAsStopTarget && {
      "@keyframes cueStopTargetPulse": {
        "0%, 100%": {
          bgcolor: "rgba(232, 138, 138, 0.05)",
          boxShadow: "inset 3px 0 0 rgba(232, 138, 138, 0.3)",
        },
        "50%": {
          bgcolor: "rgba(232, 138, 138, 0.11)",
          boxShadow: "inset 3px 0 0 rgba(232, 138, 138, 0.55)",
        },
      },
      animation: "cueStopTargetPulse 3s ease-in-out infinite",
      "@media (prefers-reduced-motion: reduce)": {
        animation: "none",
        bgcolor: "rgba(232, 138, 138, 0.12)",
        boxShadow: "inset 3px 0 0 #e88a8a",
      },
    }),
    ...(state.staticAsStopTarget && {
      bgcolor: "rgba(232, 138, 138, 0.1)",
      boxShadow: "inset 3px 0 0 rgba(232, 138, 138, 0.65)",
    }),
  };
}

export function cueNumberSx(tokens: GscTokenSet): SxProps<Theme> {
  return {
    fontVariantNumeric: "tabular-nums",
    fontWeight: 600,
    minWidth: "2.5ch",
    color: tokens.accent,
    flexShrink: 0,
  };
}

export function cueNameSx(state: Pick<
  CueRowStyleState,
  "primarySelected" | "isStop" | "isVolumeFade" | "isOpacityFade" | "hasWarning"
>): SxProps<Theme> {
  const cueNameColor = state.isStop
    ? CUE_NAME_TINT.stop
    : state.isVolumeFade
      ? CUE_NAME_TINT.volumeFade
      : state.isOpacityFade
        ? CUE_NAME_TINT.opacityFade
        : state.hasWarning
          ? CUE_NAME_TINT.warning
          : undefined;

  return {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    py: 0.25,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    ...(state.primarySelected && { fontWeight: 600 }),
    ...(cueNameColor && { color: cueNameColor }),
  };
}

export const cueDetailSx: SxProps<Theme> = {
  fontSize: 11,
  color: "text.secondary",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const cueAssetSx: SxProps<Theme> = {
  fontSize: 11,
  color: "text.secondary",
  maxWidth: 120,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

export const cueRowWarningIconSx: SxProps<Theme> = {
  color: CUE_NAME_TINT.warning,
  flexShrink: 0,
  fontSize: 18,
  opacity: 0.95,
};

export const cueRenameInputSx = (
  tokens: GscTokenSet,
): SxProps<Theme> => ({
  flex: 1,
  minWidth: 0,
  font: "inherit",
  fontSize: 14,
  py: "1px",
  px: 0.75,
  border: `1px solid ${tokens.accent}`,
  borderRadius: 1,
  bgcolor: tokens.bgElevated,
  color: tokens.text,
});

export const cueRowActionSx: SxProps<Theme> = {
  width: 26,
  height: 26,
  flexShrink: 0,
  p: 0,
  color: "text.secondary",
  "&:hover": {
    color: "error.main",
    bgcolor: "rgba(204, 68, 68, 0.15)",
  },
};

export const cueRowFadeActionSx: SxProps<Theme> = {
  ...cueRowActionSx,
  "&:hover": {
    color: "primary.main",
    bgcolor: "rgba(201, 162, 39, 0.12)",
  },
};

export const cueRowStopActionSx: SxProps<Theme> = {
  ...cueRowActionSx,
  "& svg": { fontSize: 18 },
};

export const cueExpandBtnSx = (tokens: GscTokenSet): SxProps<Theme> => ({
  width: 24,
  height: 24,
  p: 0,
  flexShrink: 0,
  borderRadius: 0.75,
  color: tokens.textMuted,
  "&:hover": {
    bgcolor: tokens.bgHover,
    color: tokens.text,
  },
});

export const cueListDropActiveSx = (tokens: GscTokenSet): SxProps<Theme> => ({
  outline: `2px dashed ${tokens.accentDim}`,
  outlineOffset: -4,
  bgcolor: "rgba(201, 162, 39, 0.06)",
});
