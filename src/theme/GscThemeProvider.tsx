import { type ReactNode, useMemo } from "react";
import { useAppViewport } from "../hooks/useAppViewport";
import { useUiStore } from "../stores/ui";
import { DirectionalThemeProvider } from "./DirectionalThemeProvider";
import { editTheme, showTheme } from "./gscTheme";

export function GscThemeProvider({ children }: { children: ReactNode }) {
  useAppViewport();
  const showMode = useUiStore((s) => s.showMode);
  const baseTheme = useMemo(() => (showMode ? showTheme : editTheme), [showMode]);

  return <DirectionalThemeProvider baseTheme={baseTheme}>{children}</DirectionalThemeProvider>;
}
