import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { type CSSProperties, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  isOutputLayerLooping,
  isOutputLayerPlaybackComplete,
  outputLayerTargetTime,
  shouldWrapVideoAtSliceEnd,
  sliceEndSec,
} from "../lib/video-playback";
import { useTransportStore } from "../stores/transport";
import type { OutputLayer } from "../types/output";
import { visualLayerSx, visualLayerWrapSx, visualStageEmptySx } from "./visualStageSx";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

interface VideoLayerProps {
  layer: OutputLayer;
  onEnded?: (cueId: string) => void;
}

/** Visible muted video — audio plays via Web Audio in the control window only. */
function VideoLayer({ layer, onEnded }: VideoLayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const layerRef = useRef(layer);
  const loopIterationRef = useRef(0);
  layerRef.current = layer;

  useEffect(() => {
    loopIterationRef.current = 0;

    const video = ref.current;
    if (!video) return;

    video.src = layer.objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.style.opacity = String(layer.opacity);

    const seekToClock = () => {
      const current = layerRef.current;
      if (video.readyState < 1 || !Number.isFinite(video.duration)) return;

      if (current.loopCount !== "inf" && isOutputLayerPlaybackComplete(current)) {
        onEnded?.(current.cueId);
        return;
      }

      try {
        video.currentTime = outputLayerTargetTime(current);
      } catch {
        /* seek not ready */
      }
    };

    const seekAndPlay = () => {
      seekToClock();
      void video.play().catch(() => {
        /* autoplay policy — user may need to interact with the control app first */
      });
    };

    const wrapLoopIfNeeded = () => {
      const current = layerRef.current;
      if (!Number.isFinite(video.duration) || !isOutputLayerLooping(current)) return;

      const endSec = sliceEndSec(current.inTime, current.sliceSec);
      if (!shouldWrapVideoAtSliceEnd(video.currentTime, endSec)) return;

      if (current.loopCount === "inf") {
        seekToClock();
        if (video.paused) {
          void video.play().catch(() => {});
        }
        return;
      }

      loopIterationRef.current += 1;
      if (loopIterationRef.current >= (current.loopCount as number)) {
        video.pause();
        onEnded?.(current.cueId);
        return;
      }

      try {
        video.currentTime = current.inTime;
      } catch {
        /* seek not ready */
      }
    };

    const handleEnded = () => {
      const current = layerRef.current;
      if (!Number.isFinite(video.duration)) return;

      if (current.loopCount === "inf") {
        seekToClock();
        void video.play().catch(() => {});
        return;
      }

      if (!isOutputLayerLooping(current)) {
        onEnded?.(current.cueId);
        return;
      }

      loopIterationRef.current += 1;
      if (loopIterationRef.current >= (current.loopCount as number)) {
        onEnded?.(current.cueId);
        return;
      }

      try {
        video.currentTime = current.inTime;
      } catch {
        /* seek not ready */
      }
      void video.play().catch(() => {});
    };

    const onError = () => {
      console.warn("[video] Could not load", layer.objectUrl);
    };

    video.addEventListener("loadedmetadata", seekAndPlay);
    video.addEventListener("timeupdate", wrapLoopIfNeeded);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", onError);

    if (video.readyState >= 1) {
      seekAndPlay();
    }

    return () => {
      video.removeEventListener("loadedmetadata", seekAndPlay);
      video.removeEventListener("timeupdate", wrapLoopIfNeeded);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", onError);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [layer.cueId, layer.objectUrl, layer.goAtMs, onEnded]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.style.opacity = String(clamp01(layer.opacity));
  }, [layer.opacity]);

  return (
    <video
      ref={ref}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block",
        opacity: clamp01(layer.opacity),
      }}
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
    <img
      src={layer.objectUrl}
      alt=""
      style={{
        ...(visualLayerSx as CSSProperties),
        opacity: clamp01(layer.opacity),
      }}
    />
  );
}

export type VisualStageRole = "control" | "output";

interface VisualStageProps {
  layers: OutputLayer[];
  stageRole: VisualStageRole;
  className?: string;
  sx?: SxProps<Theme>;
}

/** Composites active video/image layers (picture only — audio via Web Audio in control app). */
export function VisualStage({ layers, stageRole, className, sx }: VisualStageProps) {
  const { t } = useTranslation();
  const stopCue = useTransportStore((s) => s.stopCue);

  const handleEnded = useCallback(
    (cueId: string) => {
      if (stageRole === "control") {
        stopCue(cueId);
      }
    },
    [stageRole, stopCue],
  );

  return (
    <Box
      className={className}
      data-gsc-output-stage={stageRole === "output" ? "" : undefined}
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
      {layers.length === 0 && stageRole === "control" && (
        <Typography component="span" sx={visualStageEmptySx}>
          {t("output.noActiveVisualCues")}
        </Typography>
      )}
      {layers.map((layer, index) => (
        <Box key={layer.cueId} sx={{ ...visualLayerWrapSx, zIndex: index + 1 }}>
          {layer.type === "video" ? (
            <VideoLayer layer={layer} onEnded={stageRole === "control" ? handleEnded : undefined} />
          ) : (
            <ImageLayer layer={layer} />
          )}
        </Box>
      ))}
    </Box>
  );
}
