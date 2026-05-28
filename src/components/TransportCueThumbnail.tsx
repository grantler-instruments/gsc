import Box from "@mui/material/Box";
import { useEffect, useMemo, useState } from "react";
import { useAssetObjectUrl } from "../hooks/useAssetObjectUrl";
import { resolveTransportPreview } from "../lib/transport-preview";
import { getVideoThumbnailDataUrl } from "../lib/video-thumbnail";
import { useProjectStore } from "../stores/project";
import type { Cue } from "../types/cue";
import { TransportFixturePlotThumb } from "./TransportFixturePlotThumb";
import { TransportWaveformThumb } from "./TransportWaveformThumb";

const THUMB_SIZE = 48;

const crossedOutThumbSx = {
  "& img, & canvas, & svg": {
    opacity: 0.55,
    filter: "grayscale(0.35)",
  },
  "&::before, &::after": {
    content: '""',
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "130%",
    height: 2,
    bgcolor: "error.main",
    borderRadius: 0.25,
    pointerEvents: "none",
    zIndex: 1,
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.35)",
  },
  "&::before": {
    transform: "translate(-50%, -50%) rotate(45deg)",
  },
  "&::after": {
    transform: "translate(-50%, -50%) rotate(-45deg)",
  },
} as const;

interface TransportCueThumbnailProps {
  cue: Cue;
  allCues?: Cue[];
}

function useMediaThumbnail(cue: Cue): string | null {
  const imageUrl = useAssetObjectUrl(cue.type === "image" ? cue.assetPath : undefined);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (cue.type === "image") {
      setSrc(imageUrl);
      return;
    }

    if (!cue.assetPath) {
      setSrc(null);
      return;
    }

    if (cue.type === "video") {
      let cancelled = false;
      void getVideoThumbnailDataUrl(cue.assetPath, cue.inTime ?? 0).then((url) => {
        if (!cancelled) setSrc(url);
      });
      return () => {
        cancelled = true;
      };
    }

    setSrc(null);
  }, [cue.assetPath, cue.inTime, cue.type, imageUrl]);

  return cue.type === "image" ? imageUrl : src;
}

function TransportMediaThumb({ cue }: { cue: Cue }) {
  const src = useMediaThumbnail(cue);
  if (!src) return null;

  return (
    <Box
      component="img"
      src={src}
      alt=""
      sx={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}

export function TransportCueThumbnail({ cue, allCues }: TransportCueThumbnailProps) {
  const fixtures = useProjectStore((s) => s.fixtures);
  const preview = useMemo(
    () => resolveTransportPreview(cue, allCues, fixtures),
    [allCues, cue, fixtures],
  );

  let content: React.ReactNode = null;

  if (preview?.kind === "fixturePlot" && preview.dmx) {
    content = <TransportFixturePlotThumb dmx={preview.dmx} />;
  } else if (preview?.kind === "waveform" && preview.cue?.assetPath) {
    content = <TransportWaveformThumb assetPath={preview.cue.assetPath} height={THUMB_SIZE} />;
  } else if (preview?.kind === "media" && preview.cue) {
    content = <TransportMediaThumb cue={preview.cue} />;
  }

  if (!preview) {
    return null;
  }

  return (
    <Box
      sx={{
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        flexShrink: 0,
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: preview.kind === "fixturePlot" ? "#111" : "action.hover",
        border: 1,
        borderColor: "divider",
        position: "relative",
        ...(preview.crossedOut ? crossedOutThumbSx : {}),
      }}
    >
      {content}
    </Box>
  );
}

export { THUMB_SIZE as TRANSPORT_CUE_THUMB_SIZE };
