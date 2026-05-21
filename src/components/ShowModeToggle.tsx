import Button from "@mui/material/Button";
import { showModeToggleSx } from "../theme/gscTheme";
import { useGscTokens } from "../theme/useGscTokens";
import { useUiStore } from "../stores/ui";

export function ShowModeToggle() {
  const showMode = useUiStore((s) => s.showMode);
  const toggleShowMode = useUiStore((s) => s.toggleShowMode);
  const tokens = useGscTokens();

  return (
    <Button
      variant="outlined"
      onClick={toggleShowMode}
      title={
        showMode
          ? "Show mode on — editing disabled. ⌘E / Ctrl+E to exit."
          : "Enter show mode — lock editing for performance. ⌘E / Ctrl+E"
      }
      aria-pressed={showMode}
      sx={showModeToggleSx(showMode, tokens)}
    >
      {showMode ? "Show mode" : "Edit mode"}
    </Button>
  );
}
