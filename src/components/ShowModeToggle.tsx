import Button from "@mui/material/Button";
import { formatShortcut } from "../lib/keyboard";
import { useUiStore } from "../stores/ui";
import { showModeToggleSx } from "../theme/gscTheme";
import { useGscTokens } from "../theme/useGscTokens";

const toolbarActionButtonMinWidth = 148;

export function ShowModeToggle() {
  const showMode = useUiStore((s) => s.showMode);
  const toggleShowMode = useUiStore((s) => s.toggleShowMode);
  const tokens = useGscTokens();
  const shortcut = formatShortcut("e");
  const modeLabel = showMode ? "Show mode" : "Edit mode";

  return (
    <Button
      variant="outlined"
      size="small"
      onClick={toggleShowMode}
      title={
        showMode
          ? `Show mode on — editing disabled. ${shortcut} to exit.`
          : `Enter show mode — lock editing for performance. ${shortcut}`
      }
      aria-pressed={showMode}
      sx={{
        minWidth: toolbarActionButtonMinWidth,
        ...showModeToggleSx(showMode, tokens),
      }}
    >
      {`${modeLabel} (${shortcut})`}
    </Button>
  );
}
