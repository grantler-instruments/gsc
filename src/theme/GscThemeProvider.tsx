import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useMemo, type ReactNode } from "react";
import { useUiStore } from "../stores/ui";
import { editTheme, showTheme } from "./gscTheme";

export function GscThemeProvider({ children }: { children: ReactNode }) {
  const showMode = useUiStore((s) => s.showMode);
  const theme = useMemo(() => (showMode ? showTheme : editTheme), [showMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
