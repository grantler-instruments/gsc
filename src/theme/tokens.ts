/** Design tokens shared by MUI theme and domain CSS variables. */
export interface GscTokenSet {
  bg: string;
  bgElevated: string;
  bgHover: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentDim: string;
  danger: string;
  success: string;
  showModeAccent: string;
  rowSelected: string;
  rowPrimarySelected: string;
  rowActive: string;
  playingBadgeBg: string;
}

/** Brighter workshop palette for editing. */
export const editTokens: GscTokenSet = {
  bg: "#1e2229",
  bgElevated: "#272c36",
  bgHover: "#323845",
  border: "#3d4552",
  text: "#f2f4f7",
  textMuted: "#a0a8b5",
  accent: "#d4ad2a",
  accentDim: "#9a7d28",
  danger: "#d65555",
  success: "#45a06a",
  showModeAccent: "#6b9ee0",
  rowSelected: "#354158",
  rowPrimarySelected: "#3f4d66",
  rowActive: "#2a3830",
  playingBadgeBg: "#2a3830",
};

/** Subdued performance palette — similar structure, not bright. */
export const showTokens: GscTokenSet = {
  bg: "#0d0f12",
  bgElevated: "#15181d",
  bgHover: "#1d2129",
  border: "#282f38",
  text: "#d4d8de",
  textMuted: "#7d8794",
  accent: "#b8921f",
  accentDim: "#7a6520",
  danger: "#c44",
  success: "#3a8f62",
  showModeAccent: "#5b8fd4",
  rowSelected: "#1c2433",
  rowPrimarySelected: "#242e42",
  rowActive: "#1a251c",
  playingBadgeBg: "#1e2a1e",
};

export function tokensToCssVars(tokens: GscTokenSet): Record<string, string> {
  return {
    "--bg": tokens.bg,
    "--bg-elevated": tokens.bgElevated,
    "--bg-hover": tokens.bgHover,
    "--border": tokens.border,
    "--text": tokens.text,
    "--text-muted": tokens.textMuted,
    "--accent": tokens.accent,
    "--accent-dim": tokens.accentDim,
    "--danger": tokens.danger,
    "--success": tokens.success,
    "--show-mode-accent": tokens.showModeAccent,
    "--row-selected": tokens.rowSelected,
    "--row-primary-selected": tokens.rowPrimarySelected,
    "--row-active": tokens.rowActive,
    "--playing-badge-bg": tokens.playingBadgeBg,
  };
}

/** @deprecated Use editTokens or useGscTokens() */
export const gscTokens = editTokens;
