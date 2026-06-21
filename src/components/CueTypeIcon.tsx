import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import HubIcon from "@mui/icons-material/Hub";
import ImageIcon from "@mui/icons-material/Image";
import LayersIcon from "@mui/icons-material/Layers";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import OpacityIcon from "@mui/icons-material/Opacity";
import PianoIcon from "@mui/icons-material/Piano";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import SurroundSoundIcon from "@mui/icons-material/SurroundSound";
import VideocamIcon from "@mui/icons-material/Videocam";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import Box from "@mui/material/Box";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ElementType } from "react";
import { useTranslation } from "react-i18next";
import { cueTypeBadgeSx } from "../theme/cueStyles";
import type { AssetKind, CueType } from "../types/cue";

const CUE_TYPE_ICONS: Record<CueType, ElementType<SvgIconProps>> = {
  audio: AudiotrackIcon,
  video: VideocamIcon,
  image: ImageIcon,
  tts: RecordVoiceOverIcon,
  midi: PianoIcon,
  osc: HubIcon,
  dmx: LightbulbOutlinedIcon,
  group: LayersIcon,
  sequence: PlaylistPlayIcon,
  stop: StopCircleOutlinedIcon,
  wait: HourglassEmptyIcon,
  volumeFade: VolumeDownIcon,
  opacityFade: OpacityIcon,
  panFade: SurroundSoundIcon,
  lightFade: LightbulbOutlinedIcon,
};

export function CueTypeIcon({ type, ...props }: { type: CueType | AssetKind } & SvgIconProps) {
  const Icon = CUE_TYPE_ICONS[type];
  return <Icon fontSize="inherit" aria-hidden {...props} />;
}

export function CueTypeBadge({
  type,
  showLabel = true,
  compact = false,
  sx,
}: {
  type: CueType | AssetKind;
  showLabel?: boolean;
  /** Tighter padding for list rows. */
  compact?: boolean;
  sx?: SxProps<Theme>;
}) {
  const { t } = useTranslation();
  const label = type in CUE_TYPE_ICONS ? t(`cueType.${type as CueType}`) : String(type);
  return (
    <Box
      component="span"
      title={label}
      sx={[cueTypeBadgeSx(type, compact), ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      <CueTypeIcon type={type} />
      {showLabel && <Box component="span">{label}</Box>}
    </Box>
  );
}
