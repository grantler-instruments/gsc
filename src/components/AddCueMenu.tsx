import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import PublicOffIcon from "@mui/icons-material/PublicOff";
import { Fragment, useState } from "react";
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
  | "group"
  | "sequence"
  | "stop"
  | "wait"
  | "volumeFade"
  | "opacityFade"
>;

const ADD_CUE_SECTIONS: { subheader?: string; types: readonly AddCueMenuType[] }[] =
  [
    { types: ["audio", "video", "image", "midi", "osc"] },
    { subheader: "Group", types: ["sequence", "group"] },
    { subheader: "Utility", types: ["wait", "stop", "volumeFade", "opacityFade"] },
  ];

const ADD_CUE_LABELS: Record<AddCueMenuType, string> = {
  audio: "Audio",
  video: "Video",
  image: "Image",
  midi: "MIDI",
  osc: "OSC",
  group: "Parallel",
  sequence: "Sequential",
  wait: "Wait",
  stop: "Stop",
  volumeFade: "Volume fade",
  opacityFade: "Opacity fade",
};

const WEB_UNAVAILABLE_TOOLTIP = "Not available in the web app";

interface AddCueMenuProps {
  /** Opens the dropdown above the button (for footer placement). */
  dropUp?: boolean;
  fullWidth?: boolean;
}

export function AddCueMenu({ dropUp = false, fullWidth = false }: AddCueMenuProps) {
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
    } else if (type === "volumeFade" || type === "opacityFade") {
      addFadeCue(type);
    } else if (type === "wait") {
      addCue({ name: "Wait", type: "wait" });
    } else if (type === "stop") {
      addCue({ name: "Stop", type: "stop" });
    } else {
      const labels = {
        audio: "Audio cue",
        video: "Video cue",
        image: "Image cue",
        midi: "MIDI cue",
        osc: "OSC cue",
      } as const;
      addCue({ name: labels[type], type });
    }
    setAnchorEl(null);
  };

  return (
    <Box sx={{ position: "relative", flex: fullWidth ? 1 : undefined }}>
      <Button
        variant="text"
        fullWidth={fullWidth}
        disabled={showMode}
        title={showMode ? "Disabled in show mode" : undefined}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        + Cue ▾
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
          <Fragment key={section.subheader ?? section.types.join("-")}>
            {sectionIndex > 0 ? <Divider /> : null}
            {section.subheader ? (
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
                {section.subheader}
              </ListSubheader>
            ) : null}
            {section.types.map((type) => {
              const disabledOnWeb = type === "osc" && !isTauri;
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
                  {ADD_CUE_LABELS[type]}
                </Box>
                {disabledOnWeb ? (
                  <Tooltip title={WEB_UNAVAILABLE_TOOLTIP} placement="right" arrow>
                    <Box
                      component="span"
                      aria-label={WEB_UNAVAILABLE_TOOLTIP}
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
