import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { type ReactNode, useMemo } from "react";
import { useAppViewport } from "../hooks/useAppViewport";
import { useUiStore } from "../stores/ui";
import { editTheme, showTheme } from "./gscTheme";

export function GscThemeProvider({ children }: { children: ReactNode }) {
  useAppViewport();
  const showMode = useUiStore((s) => s.showMode);
  const theme = useMemo(() => (showMode ? showTheme : editTheme), [showMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
