import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { compactLayoutBreakpoint } from "../layout/responsiveLayout";

/** True on small and tiny viewports (below {@link compactLayoutBreakpoint}). */
export function useCompactLayout() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down(compactLayoutBreakpoint));
}
