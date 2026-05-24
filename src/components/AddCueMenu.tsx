import PublicOffIcon from "@mui/icons-material/PublicOff";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCueTypeLabel } from "../i18n/cueTypeLabels";
import { getPlatform } from "../platform";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import { ADD_CUE_ICON_COLORS } from "../theme/cueStyles";
import type { CueType } from "../types/cue";
import { CueTypeIcon } from "./CueTypeIcon";

type AddCueMenuType = Extract<
  CueType,
  | "audio"
  | "video"
  | "image"
  | "midi"
  | "osc"
  | "dmx"
  | "group"
  | "sequence"
  | "stop"
  | "wait"
  | "volumeFade"
  | "opacityFade"
  | "lightFade"
>;

const ADD_CUE_SECTIONS: { subheaderKey?: string; types: readonly AddCueMenuType[] }[] = [
  { types: ["audio", "video", "image", "midi", "osc", "dmx"] },
  { subheaderKey: "cueMenu.sectionGroup", types: ["sequence", "group"] },
  {
    subheaderKey: "cueMenu.sectionUtility",
    types: ["wait", "stop", "volumeFade", "opacityFade", "lightFade"],
  },
];

const DEFAULT_CUE_NAME_KEYS: Partial<Record<AddCueMenuType, string>> = {
  audio: "cueMenu.defaultAudio",
  video: "cueMenu.defaultVideo",
  image: "cueMenu.defaultImage",
  midi: "cueMenu.defaultMidi",
  osc: "cueMenu.defaultOsc",
  dmx: "cueMenu.defaultDmx",
};

interface AddCueMenuProps {
  /** Opens the dropdown above the button (for footer placement). */
  dropUp?: boolean;
  fullWidth?: boolean;
}

export function AddCueMenu({ dropUp = false, fullWidth = false }: AddCueMenuProps) {
  const { t } = useTranslation();
  const addCue = useProjectStore((s) => s.addCue);
  const addGroupCue = useProjectStore((s) => s.addGroupCue);
  const addSequenceCue = useProjectStore((s) => s.addSequenceCue);
  const addFadeCue = useProjectStore((s) => s.addFadeCue);
  const showMode = useUiStore((s) => s.showMode);
  const isTauri = getPlatform() === "tauri";
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleAddCue = (type: AddCueMenuType) => {
    if (type === "group") {
      addGroupCue();
    } else if (type === "sequence") {
      addSequenceCue();
    } else if (type === "volumeFade" || type === "opacityFade" || type === "lightFade") {
      addFadeCue(type);
    } else if (type === "wait") {
      addCue({ name: getCueTypeLabel("wait"), type: "wait" });
    } else if (type === "stop") {
      addCue({ name: getCueTypeLabel("stop"), type: "stop" });
    } else {
      const nameKey = DEFAULT_CUE_NAME_KEYS[type];
      addCue({ name: nameKey ? t(nameKey) : getCueTypeLabel(type), type });
    }
    setAnchorEl(null);
  };

  return (
    <Box sx={{ position: "relative", flex: fullWidth ? 1 : undefined }}>
      <Button
        variant="text"
        fullWidth={fullWidth}
        disabled={showMode}
        title={showMode ? t("common.state.disabledInShowMode") : undefined}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {t("cueMenu.addCue")}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: dropUp ? "top" : "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: dropUp ? "bottom" : "top",
          horizontal: "left",
        }}
      >
        {ADD_CUE_SECTIONS.map((section, sectionIndex) => (
          <Fragment key={section.subheaderKey ?? section.types.join("-")}>
            {sectionIndex > 0 ? <Divider /> : null}
            {section.subheaderKey ? (
              <ListSubheader
                disableSticky
                sx={{
                  bgcolor: "background.paper",
                  lineHeight: "32px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "text.secondary",
                }}
              >
                {t(section.subheaderKey)}
              </ListSubheader>
            ) : null}
            {section.types.map((type) => {
              const disabledOnWeb =
                (type === "osc" || type === "dmx" || type === "lightFade") && !isTauri;
              return (
                <MenuItem
                  key={type}
                  disabled={disabledOnWeb}
                  onClick={() => handleAddCue(type)}
                  sx={disabledOnWeb ? { opacity: 0.72 } : undefined}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 28,
                      color: ADD_CUE_ICON_COLORS[type] ?? "inherit",
                      "& .MuiSvgIcon-root": { fontSize: 20, opacity: 0.9 },
                      ...(disabledOnWeb && { opacity: 0.45 }),
                    }}
                  >
                    <CueTypeIcon type={type} />
                  </ListItemIcon>
                  <Box component="span" sx={{ flex: 1 }}>
                    {getCueTypeLabel(type)}
                  </Box>
                  {disabledOnWeb ? (
                    <Tooltip title={t("common.state.notAvailableOnWeb")} placement="right" arrow>
                      <Box
                        component="span"
                        aria-label={t("common.state.notAvailableOnWeb")}
                        sx={{
                          ml: 1.5,
                          display: "inline-flex",
                          alignItems: "center",
                          flexShrink: 0,
                          pointerEvents: "auto",
                          cursor: "help",
                          color: "text.disabled",
                        }}
                      >
                        <PublicOffIcon sx={{ fontSize: 18 }} />
                      </Box>
                    </Tooltip>
                  ) : null}
                </MenuItem>
              );
            })}
          </Fragment>
        ))}
      </Menu>
    </Box>
  );
}
