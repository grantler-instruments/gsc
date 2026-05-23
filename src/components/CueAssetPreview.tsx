import Box from "@mui/material/Box";
import { useEffect, useRef } from "react";
import { useAssetObjectUrl } from "../hooks/useAssetObjectUrl";
import { resolveEffectiveOpacity, useFadeStore } from "../stores/fade";
import type { Cue } from "../types/cue";
import {
  cueAssetPreviewMediaSx,
  cueAssetPreviewMissingSx,
  cueAssetPreviewSx,
} from "./cueAssetPreviewSx";

interface CueAssetPreviewProps {
  cue: Cue;
  className?: string;
}

/** Static preview of a video/image cue asset in the inspector. */
export function CueAssetPreview({ cue, className }: CueAssetPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameMs = useFadeStore((s) => s.frameMs);
  const objectUrl = useAssetObjectUrl(cue.assetPath);

  if (!cue.assetPath || (cue.type !== "video" && cue.type !== "image")) {
    return null;
  }

  if (!objectUrl) {
    return (
      <Box className={className} sx={{ ...cueAssetPreviewSx, ...cueAssetPreviewMissingSx }}>
        Asset not loaded — re-import after opening a project.
      </Box>
    );
  }

  const inTime = cue.inTime ?? 0;
  const opacity = resolveEffectiveOpacity(cue.id, cue.opacity ?? 1, frameMs);

  if (cue.type === "image") {
    return (
      <Box className={className} sx={cueAssetPreviewSx}>
        <Box
          component="img"
          src={objectUrl}
          alt=""
          sx={cueAssetPreviewMediaSx}
          style={{ opacity }}
        />
      </Box>
    );
  }

  return (
    <VideoAssetPreview
      objectUrl={objectUrl}
      inTime={inTime}
      opacity={opacity}
      className={className}
      videoRef={videoRef}
    />
  );
}

function VideoAssetPreview({
  objectUrl,
  inTime,
  opacity,
  className,
  videoRef,
}: {
  objectUrl: string;
  inTime: number;
  opacity: number;
  className?: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const seek = () => {
      try {
        video.currentTime = inTime;
      } catch {
        /* metadata not ready */
      }
    };

    video.addEventListener("loadedmetadata", seek);
    if (video.readyState >= 1) seek();

    return () => {
      video.removeEventListener("loadedmetadata", seek);
      video.removeAttribute("src");
      video.load();
    };
  }, [objectUrl, inTime, videoRef]);

  return (
    <Box className={className} sx={cueAssetPreviewSx}>
      <Box
        component="video"
        ref={videoRef}
        playsInline
        muted
        sx={cueAssetPreviewMediaSx}
        style={{ opacity }}
      />
    </Box>
  );
}
