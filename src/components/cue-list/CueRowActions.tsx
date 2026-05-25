import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import OpacityIcon from "@mui/icons-material/Opacity";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import SurroundSoundIcon from "@mui/icons-material/SurroundSound";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import IconButton from "@mui/material/IconButton";
import { useTranslation } from "react-i18next";
import { canStopTarget, isUtilityCue } from "../../lib/cues";
import {
  canLightFadeTarget,
  canOpacityFadeTarget,
  canPanFadeTarget,
  canVolumeFadeTarget,
} from "../../lib/fade";
import { cueRowFadeActionSx, cueRowStopActionSx } from "../../theme/cueStyles";
import type { Cue } from "../../types/cue";

interface CueRowActionsProps {
  cue: Cue;
  canEdit: boolean;
  onCreateStop: () => void;
  onCreateVolumeFade: () => void;
  onCreateOpacityFade: () => void;
  onCreatePanFade: () => void;
  onCreateLightFade: () => void;
}

export function CueRowActions({
  cue,
  canEdit,
  onCreateStop,
  onCreateVolumeFade,
  onCreateOpacityFade,
  onCreatePanFade,
  onCreateLightFade,
}: CueRowActionsProps) {
  const { t } = useTranslation();

  if (!canEdit) return null;

  const isUtility = isUtilityCue(cue);
  const showVolumeFadeAction = !isUtility && canVolumeFadeTarget(cue);
  const showOpacityFadeAction = !isUtility && canOpacityFadeTarget(cue);
  const showPanFadeAction = !isUtility && canPanFadeTarget(cue);
  const showLightFadeAction = !isUtility && canLightFadeTarget(cue);
  const showStopAction = canStopTarget(cue);

  return (
    <>
      {showVolumeFadeAction && (
        <IconButton
          size="small"
          sx={cueRowFadeActionSx}
          title={t("cueList.createVolumeFade", { label: cue.number })}
          aria-label={t("cueList.createVolumeFade", { label: cue.name })}
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
          title={t("cueList.createOpacityFade", { label: cue.number })}
          aria-label={t("cueList.createOpacityFade", { label: cue.name })}
          onClick={(e) => {
            e.stopPropagation();
            onCreateOpacityFade();
          }}
        >
          <OpacityIcon fontSize="small" />
        </IconButton>
      )}
      {showPanFadeAction && (
        <IconButton
          size="small"
          sx={cueRowFadeActionSx}
          title={t("cueList.createPanFade", { label: cue.number })}
          aria-label={t("cueList.createPanFade", { label: cue.name })}
          onClick={(e) => {
            e.stopPropagation();
            onCreatePanFade();
          }}
        >
          <SurroundSoundIcon fontSize="small" />
        </IconButton>
      )}
      {showLightFadeAction && (
        <IconButton
          size="small"
          sx={cueRowFadeActionSx}
          title={t("cueList.createLightFade", { label: cue.number })}
          aria-label={t("cueList.createLightFade", { label: cue.name })}
          onClick={(e) => {
            e.stopPropagation();
            onCreateLightFade();
          }}
        >
          <LightbulbOutlinedIcon fontSize="small" />
        </IconButton>
      )}
      {showStopAction && (
        <IconButton
          size="small"
          sx={cueRowStopActionSx}
          title={t("cueList.createStopCue", { label: cue.number })}
          aria-label={t("cueList.createStopCue", { label: cue.name })}
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
