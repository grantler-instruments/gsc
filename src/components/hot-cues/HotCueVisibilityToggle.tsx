import WhatshotIcon from "@mui/icons-material/Whatshot";
import IconButton from "@mui/material/IconButton";
import { useTranslation } from "react-i18next";
import { useUiStore } from "../../stores/ui";

/** Show/hide the hot-cue panel in the desktop cue workspace header. */
export function HotCueVisibilityToggle() {
  const { t } = useTranslation();
  const visible = useUiStore((s) => s.hotCuePanelVisible);
  const toggle = useUiStore((s) => s.toggleHotCuePanelVisible);

  return (
    <IconButton
      size="small"
      onClick={toggle}
      aria-pressed={visible}
      title={visible ? t("hotCues.hidePanel") : t("hotCues.showPanel")}
      aria-label={visible ? t("hotCues.hidePanelAria") : t("hotCues.showPanelAria")}
      sx={{
        color: visible ? "text.primary" : "text.secondary",
        opacity: visible ? 1 : 0.55,
      }}
    >
      <WhatshotIcon sx={{ fontSize: 16 }} />
    </IconButton>
  );
}
