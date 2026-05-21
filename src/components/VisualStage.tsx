import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { useCallback, useEffect, useRef } from "react";
import {
  isOutputLayerLooping,
  isOutputLayerPlaybackComplete,
  outputLayerTargetTime,
  shouldWrapVideoAtSliceEnd,
  sliceEndSec,
} from "../lib/video-playback";
import { useTransportStore } from "../stores/transport";
import type { OutputLayer } from "../types/output";
import {
  visualLayerSx,
  visualLayerWrapSx,
  visualStageEmptySx,
} from "./visualStageSx";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

interface VideoLayerProps {
  layer: OutputLayer;
  onEnded?: (cueId: string) => void;
}

/** Silent clock-synced video — audio plays via Web Audio in the control window only. */
function VideoLayer({ layer, onEnded }: VideoLayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const layerRef = useRef(layer);
  const completedRef = useRef(false);
  layerRef.current = layer;

  useEffect(() => {
    completedRef.current = false;

    const video = ref.current;
    if (!video) return;

    video.src = layer.objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.style.opacity = String(layer.opacity);

    let rafId = 0;

    const applyClock = () => {
      const current = layerRef.current;
      if (video.readyState < 1) return;

      const target = outputLayerTargetTime(current);
      if (!Number.isFinite(target)) return;

      const endSec = sliceEndSec(current.inTime, current.sliceSec);
      const looping = isOutputLayerLooping(current);
      const needsLoopWrap = looping && shouldWrapVideoAtSliceEnd(video.currentTime, endSec);

      if (needsLoopWrap || Math.abs(video.currentTime - target) > 0.04) {
        try {
          video.currentTime = target;
        } catch {
          /* seek not ready */
        }
      }

      if (
        !completedRef.current &&
        current.loopCount !== "inf" &&
        isOutputLayerPlaybackComplete(current)
      ) {
        completedRef.current = true;
        onEnded?.(current.cueId);
      }
    };

    const tick = () => {
      if (!video.paused) {
        video.pause();
      }
      applyClock();
      rafId = requestAnimationFrame(tick);
    };

    const onLoadedMetadata = () => {
      applyClock();
      if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const onVideoEnded = () => {
      const current = layerRef.current;
      if (!isOutputLayerLooping(current)) return;

      const target = outputLayerTargetTime(current);
      try {
        video.currentTime = target;
      } catch {
        /* seek not ready */
      }
    };

    const onError = () => {
      console.warn("[video] Could not load", layer.objectUrl);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ended", onVideoEnded);
    video.addEventListener("error", onError);

    if (video.readyState >= 1) {
      onLoadedMetadata();
    } else {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(rafId);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("ended", onVideoEnded);
      video.removeEventListener("error", onError);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [layer.cueId, layer.objectUrl, onEnded]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.style.opacity = String(clamp01(layer.opacity));
  }, [layer.opacity]);

  return (
    <Box
      component="video"
      ref={ref}
      sx={visualLayerSx}
      playsInline
      muted
    />
  );
}

interface ImageLayerProps {
  layer: OutputLayer;
}

function ImageLayer({ layer }: ImageLayerProps) {
  return (
    <Box
      component="img"
      src={layer.objectUrl}
      alt=""
      sx={visualLayerSx}
      style={{ opacity: clamp01(layer.opacity) }}
    />
  );
}

export type VisualStageRole = "control" | "output";

interface VisualStageProps {
  layers: OutputLayer[];
  role: VisualStageRole;
  className?: string;
  sx?: SxProps<Theme>;
}

/** Composites active video/image layers (picture only — audio via Web Audio in control app). */
export function VisualStage({ layers, role, className, sx }: VisualStageProps) {
  const stopCue = useTransportStore((s) => s.stopCue);

  const handleEnded = useCallback(
    (cueId: string) => {
      if (role === "control") {
        stopCue(cueId);
      }
    },
    [role, stopCue],
  );

  return (
    <Box
      className={className}
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 120,
        bgcolor: "#000",
        overflow: "hidden",
        ...sx,
      }}
    >
      {layers.length === 0 && role === "control" && (
        <Typography component="span" sx={visualStageEmptySx}>
          No active video or image cues
        </Typography>
      )}
      {layers.map((layer, index) => (
        <Box
          key={layer.cueId}
          sx={{ ...visualLayerWrapSx, zIndex: index + 1 }}
        >
          {layer.type === "video" ? (
            <VideoLayer
              layer={layer}
              onEnded={role === "control" ? handleEnded : undefined}
            />
          ) : (
            <ImageLayer layer={layer} />
          )}
        </Box>
      ))}
    </Box>
  );
}
