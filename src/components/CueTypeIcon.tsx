import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import HubIcon from "@mui/icons-material/Hub";
import ImageIcon from "@mui/icons-material/Image";
import LayersIcon from "@mui/icons-material/Layers";
import OpacityIcon from "@mui/icons-material/Opacity";
import PianoIcon from "@mui/icons-material/Piano";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VideocamIcon from "@mui/icons-material/Videocam";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { ElementType } from "react";
import type { AssetKind, CueType } from "../types/cue";
import { cueTypeBadgeSx } from "../theme/cueStyles";

const CUE_TYPE_ICONS: Record<CueType, ElementType<SvgIconProps>> = {
  audio: AudiotrackIcon,
  video: VideocamIcon,
  image: ImageIcon,
  midi: PianoIcon,
  osc: HubIcon,
  dmx: LightbulbOutlinedIcon,
  group: LayersIcon,
  sequence: PlaylistPlayIcon,
  stop: StopCircleOutlinedIcon,
  wait: HourglassEmptyIcon,
  volumeFade: VolumeDownIcon,
  opacityFade: OpacityIcon,
  lightFade: LightbulbOutlinedIcon,
};

const CUE_TYPE_LABELS: Record<CueType, string> = {
  audio: "Audio",
  video: "Video",
  image: "Image",
  midi: "MIDI",
  osc: "OSC",
  dmx: "Light",
  group: "Parallel",
  sequence: "Sequence",
  stop: "Stop",
  wait: "Wait",
  volumeFade: "Volume fade",
  opacityFade: "Opacity fade",
  lightFade: "Light fade",
};

export function CueTypeIcon({
  type,
  ...props
}: { type: CueType | AssetKind } & SvgIconProps) {
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
  const label =
    type in CUE_TYPE_LABELS
      ? CUE_TYPE_LABELS[type as CueType]
      : String(type);
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
