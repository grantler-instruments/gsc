import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useState } from "react";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import type { CueType } from "../types/cue";
import { CueTypeIcon } from "./CueTypeIcon";

const ADD_CUE_TYPES = [
  "audio",
  "video",
  "image",
  "midi",
  "group",
  "sequence",
  "volumeFade",
  "opacityFade",
] as const satisfies readonly CueType[];

const ADD_CUE_LABELS: Record<(typeof ADD_CUE_TYPES)[number], string> = {
  audio: "Audio",
  video: "Video",
  image: "Image",
  midi: "MIDI",
  group: "Parallel",
  sequence: "Sequence",
  volumeFade: "Volume fade",
  opacityFade: "Opacity fade",
};

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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleAddCue = (type: (typeof ADD_CUE_TYPES)[number]) => {
    if (type === "group") {
      addGroupCue();
    } else if (type === "sequence") {
      addSequenceCue();
    } else if (type === "volumeFade" || type === "opacityFade") {
      addFadeCue(type);
    } else {
      const labels = {
        audio: "Audio cue",
        video: "Video cue",
        image: "Image cue",
        midi: "MIDI cue",
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
        {ADD_CUE_TYPES.map((type) => (
          <MenuItem
            key={type}
            onClick={() => handleAddCue(type)}
            className={`add-cue-item add-cue-item-${type}`}
          >
            <CueTypeIcon type={type} className="add-cue-item-icon" />
            {ADD_CUE_LABELS[type]}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
