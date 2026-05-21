import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import ImageIcon from "@mui/icons-material/Image";
import LayersIcon from "@mui/icons-material/Layers";
import OpacityIcon from "@mui/icons-material/Opacity";
import PianoIcon from "@mui/icons-material/Piano";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VideocamIcon from "@mui/icons-material/Videocam";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { ElementType } from "react";
import type { AssetKind, CueType } from "../types/cue";

const CUE_TYPE_ICONS: Record<CueType, ElementType<SvgIconProps>> = {
  audio: AudiotrackIcon,
  video: VideocamIcon,
  image: ImageIcon,
  midi: PianoIcon,
  group: LayersIcon,
  sequence: PlaylistPlayIcon,
  stop: StopCircleOutlinedIcon,
  volumeFade: VolumeDownIcon,
  opacityFade: OpacityIcon,
};

const CUE_TYPE_LABELS: Record<CueType, string> = {
  audio: "Audio",
  video: "Video",
  image: "Image",
  midi: "MIDI",
  group: "Parallel",
  sequence: "Sequence",
  stop: "Stop",
  volumeFade: "Volume fade",
  opacityFade: "Opacity fade",
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
  className,
}: {
  type: CueType | AssetKind;
  showLabel?: boolean;
  className?: string;
}) {
  const label = CUE_TYPE_LABELS[type];
  return (
    <span
      className={["cue-type", `cue-type-${type}`, className]
        .filter(Boolean)
        .join(" ")}
      title={label}
    >
      <CueTypeIcon type={type} className="cue-type-icon" />
      {showLabel && <span className="cue-type-label">{label}</span>}
    </span>
  );
}
