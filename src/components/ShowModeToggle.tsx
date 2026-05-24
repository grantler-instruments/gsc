import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";
import { formatShortcut } from "../lib/keyboard";
import { useUiStore } from "../stores/ui";
import { showModeToggleSx } from "../theme/gscTheme";
import { useGscTokens } from "../theme/useGscTokens";

const toolbarActionButtonMinWidth = 148;

export function ShowModeToggle() {
  const { t } = useTranslation();
  const showMode = useUiStore((s) => s.showMode);
  const toggleShowMode = useUiStore((s) => s.toggleShowMode);
  const tokens = useGscTokens();
  const shortcut = formatShortcut("e");
  const modeLabel = showMode ? t("showMode.showMode") : t("showMode.editMode");

  return (
    <Button
      variant="outlined"
      size="small"
      onClick={toggleShowMode}
      title={
        showMode ? t("showMode.onTooltip", { shortcut }) : t("showMode.enterTooltip", { shortcut })
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
