import { alpha, createTheme, type Theme } from "@mui/material/styles";
import {
  editTokens,
  showTokens,
  tokensToCssVars,
  type GscTokenSet,
} from "./tokens";

function buildComponentOverrides(tokens: GscTokenSet) {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": tokensToCssVars(tokens),
        html: { height: "100%", colorScheme: "dark" as const },
        body: {
          height: "100%",
          margin: 0,
          backgroundColor: tokens.bg,
          color: tokens.text,
        },
        "#root": { height: "100%" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: "none" as const,
          fontWeight: 500,
          fontSize: 13,
          borderRadius: 4,
          padding: "6px 14px",
        },
        sizeSmall: { fontSize: 12, padding: "2px 8px" },
        contained: {
          "&.MuiButton-colorPrimary": {
            fontWeight: 700,
            minWidth: 64,
            color: tokens.bg,
            "&:hover": { filter: "brightness(1.08)" },
          },
        },
        outlined: {
          borderColor: tokens.border,
          backgroundColor: tokens.bgHover,
          color: tokens.text,
          "&:hover": {
            borderColor: tokens.textMuted,
            backgroundColor: tokens.bgHover,
          },
          "&.MuiButton-colorError": {
            borderColor: tokens.danger,
            color: tokens.danger,
            backgroundColor: "transparent",
          },
        },
        text: {
          color: tokens.text,
          "&:hover": {
            backgroundColor: tokens.bgHover,
            borderColor: tokens.border,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          color: tokens.textMuted,
          "&:hover": {
            backgroundColor: tokens.bgHover,
            color: tokens.text,
          },
        },
        sizeSmall: { padding: 4 },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" as const, variant: "outlined" as const },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            backgroundColor: tokens.bg,
            fontSize: 14,
            "& fieldset": { borderColor: tokens.border },
            "&:hover fieldset": { borderColor: tokens.textMuted },
            "&.Mui-focused fieldset": {
              borderColor: tokens.accent,
            },
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 40,
          borderBottom: `1px solid ${tokens.border}`,
        },
        indicator: { backgroundColor: tokens.accent },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 40,
          fontSize: 12,
          fontWeight: 500,
          textTransform: "none" as const,
          color: tokens.textMuted,
          "&.Mui-selected": { color: tokens.text },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { height: 18, fontSize: 10, fontWeight: 700 },
        colorSuccess: { color: tokens.bg },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { width: 100, color: tokens.accent },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: tokens.bgElevated,
          border: `1px solid ${tokens.border}`,
          minWidth: 180,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 13,
          gap: 8,
          "&:hover": { backgroundColor: tokens.bgHover },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: 12,
          backgroundColor: tokens.bgElevated,
          border: `1px solid ${tokens.border}`,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.04em",
          color: tokens.textMuted,
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: { display: "flex", gap: 0 },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          flex: 1,
          textTransform: "none" as const,
          fontSize: 13,
          color: tokens.textMuted,
          borderColor: tokens.border,
          "&.Mui-selected": {
            backgroundColor: tokens.bgHover,
            color: tokens.text,
          },
          "&.Mui-disabled": { opacity: 0.45 },
        },
      },
    },
  };
}

export function createGscTheme(tokens: GscTokenSet): Theme {
  return createTheme({
    palette: {
      mode: "dark",
      primary: { main: tokens.accent },
      error: { main: tokens.danger },
      success: { main: tokens.success },
      info: { main: tokens.showModeAccent },
      background: {
        default: tokens.bg,
        paper: tokens.bgElevated,
      },
      text: {
        primary: tokens.text,
        secondary: tokens.textMuted,
      },
      divider: tokens.border,
    },
    typography: {
      fontFamily: '"SF Pro Text", system-ui, -apple-system, sans-serif',
      fontSize: 14,
      subtitle2: {
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: tokens.textMuted,
      },
      caption: { fontSize: 12 },
      overline: {
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.06em",
        lineHeight: 1.4,
      },
    },
    shape: { borderRadius: 4 },
    components: buildComponentOverrides(tokens),
  });
}

export const editTheme = createGscTheme(editTokens);
export const showTheme = createGscTheme(showTokens);

/** @deprecated Use editTheme */
export const gscTheme = editTheme;

export function showModeToggleSx(active: boolean, tokens: GscTokenSet) {
  return active
    ? {
        borderColor: tokens.showModeAccent,
        color: tokens.showModeAccent,
        backgroundColor: alpha(tokens.showModeAccent, 0.22),
      }
    : undefined;
}
