import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import OpacityIcon from "@mui/icons-material/Opacity";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import IconButton from "@mui/material/IconButton";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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
      {!isUtility && (
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
