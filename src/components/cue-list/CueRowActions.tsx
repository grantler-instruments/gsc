import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import OpacityIcon from "@mui/icons-material/Opacity";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import IconButton from "@mui/material/IconButton";
import { isUtilityCue } from "../../lib/cues";
import { canLightFadeTarget, canOpacityFadeTarget, canVolumeFadeTarget } from "../../lib/fade";
import { cueRowFadeActionSx, cueRowStopActionSx } from "../../theme/cueStyles";
import type { Cue } from "../../types/cue";

interface CueRowActionsProps {
  cue: Cue;
  canEdit: boolean;
  onCreateStop: () => void;
  onCreateVolumeFade: () => void;
  onCreateOpacityFade: () => void;
  onCreateLightFade: () => void;
}

export function CueRowActions({
  cue,
  canEdit,
  onCreateStop,
  onCreateVolumeFade,
  onCreateOpacityFade,
  onCreateLightFade,
}: CueRowActionsProps) {
  if (!canEdit) return null;

  const isUtility = isUtilityCue(cue);
  const showVolumeFadeAction = !isUtility && canVolumeFadeTarget(cue);
  const showOpacityFadeAction = !isUtility && canOpacityFadeTarget(cue);
  const showLightFadeAction = !isUtility && canLightFadeTarget(cue);

  return (
    <>
      {showVolumeFadeAction && (
        <IconButton
          size="small"
          sx={cueRowFadeActionSx}
          title={`Create volume fade for ${cue.number}`}
          aria-label={`Create volume fade for ${cue.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onCreateVolumeFade();
          }}
        >
          <VolumeDownIcon fontSize="small" />
        </IconButton>
      )}
      {showOpacityFadeAction && (
        <IconButton
          size="small"
          sx={cueRowFadeActionSx}
          title={`Create opacity fade for ${cue.number}`}
          aria-label={`Create opacity fade for ${cue.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onCreateOpacityFade();
          }}
        >
          <OpacityIcon fontSize="small" />
        </IconButton>
      )}
      {showLightFadeAction && (
        <IconButton
          size="small"
          sx={cueRowFadeActionSx}
          title={`Create light fade for ${cue.number}`}
          aria-label={`Create light fade for ${cue.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onCreateLightFade();
          }}
        >
          <LightbulbOutlinedIcon fontSize="small" />
        </IconButton>
      )}
      {!isUtility && (
        <IconButton
          size="small"
          sx={cueRowStopActionSx}
          title={`Create stop cue for ${cue.number}`}
          aria-label={`Create stop cue for ${cue.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onCreateStop();
          }}
        >
          <StopCircleOutlinedIcon fontSize="small" />
        </IconButton>
      )}
    </>
  );
}
