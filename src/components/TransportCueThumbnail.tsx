import Box from "@mui/material/Box";
import { useEffect, useMemo, useState } from "react";
import { getStopTarget } from "../lib/cues";
import { getVideoThumbnailDataUrl } from "../lib/video-thumbnail";
import type { Cue } from "../types/cue";
import { vfsGetObjectUrl } from "../vfs/engine";

const THUMB_SIZE = 48;

interface TransportCueThumbnailProps {
  cue: Cue;
  allCues?: Cue[];
}

function useMediaThumbnail(cue: Cue): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!cue.assetPath) {
      setSrc(null);
      return;
    }

    if (cue.type === "image") {
      setSrc(vfsGetObjectUrl(cue.assetPath) ?? null);
      return;
    }

    if (cue.type === "video") {
      let cancelled = false;
      void getVideoThumbnailDataUrl(cue.assetPath, cue.inTime ?? 0).then(
        (url) => {
          if (!cancelled) setSrc(url);
        },
      );
      return () => {
        cancelled = true;
      };
    }

    setSrc(null);
  }, [cue.assetPath, cue.inTime, cue.type]);

  return src;
}

export function TransportCueThumbnail({
  cue,
  allCues,
}: TransportCueThumbnailProps) {
  const preview = useMemo(() => {
    if (cue.type === "stop" && allCues) {
      const target = getStopTarget(cue, allCues);
      if (target) {
        return { cue: target, crossedOut: true as const };
      }
    }
    return { cue, crossedOut: false as const };
  }, [allCues, cue]);

  const src = useMediaThumbnail(preview.cue);

  return (
    <Box
      sx={{
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        flexShrink: 0,
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: "action.hover",
        border: 1,
        borderColor: "divider",
        position: "relative",
        ...(preview.crossedOut && {
          "& img": {
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
        }),
      }}
    >
      {src ? (
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
      ) : null}
    </Box>
  );
}

export { THUMB_SIZE as TRANSPORT_CUE_THUMB_SIZE };
