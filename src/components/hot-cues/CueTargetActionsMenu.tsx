import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import OpacityIcon from "@mui/icons-material/Opacity";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import SurroundSoundIcon from "@mui/icons-material/SurroundSound";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useTranslation } from "react-i18next";
import { canStopTarget, isUtilityCue } from "../../lib/cues";
import {
  canLightFadeTarget,
  canOpacityFadeTarget,
  canPanFadeTarget,
  canVolumeFadeTarget,
} from "../../lib/fade";
import type { Cue } from "../../types/cue";

export interface CueTargetActionsMenuState {
  mouseX: number;
  mouseY: number;
  cueId: string;
}

interface CueTargetActionsMenuProps {
  menu: CueTargetActionsMenuState | null;
  cue: Cue | undefined;
  onClose: () => void;
  onCreateStop: () => void;
  onCreateVolumeFade: () => void;
  onCreateOpacityFade: () => void;
  onCreatePanFade: () => void;
  onCreateLightFade: () => void;
}

/** Context menu for creating stop/fade cues targeting a media or container cue. */
export function CueTargetActionsMenu({
  menu,
  cue,
  onClose,
  onCreateStop,
  onCreateVolumeFade,
  onCreateOpacityFade,
  onCreatePanFade,
  onCreateLightFade,
}: CueTargetActionsMenuProps) {
  const { t } = useTranslation();

  if (!cue) return null;

  const isUtility = isUtilityCue(cue);
  const showVolumeFade = !isUtility && canVolumeFadeTarget(cue);
  const showOpacityFade = !isUtility && canOpacityFadeTarget(cue);
  const showPanFade = !isUtility && canPanFadeTarget(cue);
  const showLightFade = !isUtility && canLightFadeTarget(cue);
  const showStop = canStopTarget(cue);
  const hasActions = showVolumeFade || showOpacityFade || showPanFade || showLightFade || showStop;

  return (
    <Menu
      open={menu !== null && hasActions}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={menu ? { top: menu.mouseY, left: menu.mouseX } : undefined}
    >
      {showStop && (
        <MenuItem
          onClick={() => {
            onCreateStop();
            onClose();
          }}
        >
          <ListItemIcon>
            <StopCircleOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("cueList.createStopCue", { label: cue.name })}</ListItemText>
        </MenuItem>
      )}
      {showVolumeFade && (
        <MenuItem
          onClick={() => {
            onCreateVolumeFade();
            onClose();
          }}
        >
          <ListItemIcon>
            <VolumeDownIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("cueList.createVolumeFade", { label: cue.name })}</ListItemText>
        </MenuItem>
      )}
      {showOpacityFade && (
        <MenuItem
          onClick={() => {
            onCreateOpacityFade();
            onClose();
          }}
        >
          <ListItemIcon>
            <OpacityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("cueList.createOpacityFade", { label: cue.name })}</ListItemText>
        </MenuItem>
      )}
      {showPanFade && (
        <MenuItem
          onClick={() => {
            onCreatePanFade();
            onClose();
          }}
        >
          <ListItemIcon>
            <SurroundSoundIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("cueList.createPanFade", { label: cue.name })}</ListItemText>
        </MenuItem>
      )}
      {showLightFade && (
        <MenuItem
          onClick={() => {
            onCreateLightFade();
            onClose();
          }}
        >
          <ListItemIcon>
            <LightbulbOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("cueList.createLightFade", { label: cue.name })}</ListItemText>
        </MenuItem>
      )}
    </Menu>
  );
}
