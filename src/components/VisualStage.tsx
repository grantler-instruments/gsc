import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { audioEngine } from "../audio/engine";
import {
  attachTransportSyncedVideo,
  type TransportVideoSyncAttachment,
  transportTimingFromOutputLayer,
} from "../lib/transport-synced-video";
import { isTauri } from "../platform";
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

function VideoLayer({ layer, onEnded }: VideoLayerProps) {
  // Browser output has independently tested control/output video timing. Keep
  // its preview element separate; the shared decoder is a Tauri optimization.
  return isTauri() ? (
    <AudioVideoLayer layer={layer} onEnded={onEnded} />
  ) : (
    <ControlVideoLayer layer={layer} onEnded={onEnded} />
  );
}

/** Control preview — keeps transport clock in sync and reports end-of-playback. */
function ControlVideoLayer({ layer, onEnded }: VideoLayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const layerRef = useRef(layer);
  const syncRef = useRef<TransportVideoSyncAttachment | null>(null);
  layerRef.current = layer;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    video.src = layer.objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const sync = attachTransportSyncedVideo(
      video,
      () => transportTimingFromOutputLayer(layerRef.current),
      {
        onEnded: onEnded ? () => onEnded(layerRef.current.cueId) : undefined,
      },
    );
    syncRef.current = sync;

    const seekAndPlay = () => {
      sync.seekAndPlay();
    };

    const onError = () => {
      console.warn("[video] Could not load", layer.objectUrl);
    };

    video.addEventListener("loadedmetadata", seekAndPlay);
    video.addEventListener("error", onError);

    if (video.readyState >= 1) {
      seekAndPlay();
    }

    return () => {
      sync.detach();
      syncRef.current = null;
      video.removeEventListener("loadedmetadata", seekAndPlay);
      video.removeEventListener("error", onError);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [layer.objectUrl, onEnded]);

  useEffect(() => {
    const sync = syncRef.current;
    if (!sync) return;
    sync.resetState();
    sync.seekToClock();
  }, [layer.goAtMs, layer.inTime, layer.sliceSec, layer.loopCount]);

  return (
    <video
      ref={ref}
      style={{
        ...(visualLayerSx as CSSProperties),
        opacity: clamp01(layer.opacity),
      }}
      playsInline
      muted
    />
  );
}

/**
 * Displays the audio engine's video element when it is available. The element
 * is already playing for the cue's audio, so adopting it avoids asking
 * WebKit/GStreamer to decode the same file a second time for the preview.
 */
function AudioVideoLayer({ layer, onEnded }: VideoLayerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [video, setVideo] = useState(() => audioEngine.getVideoVoiceElement(layer.cueId));

  useEffect(() => {
    const syncVideo = () => setVideo(audioEngine.getVideoVoiceElement(layer.cueId));
    syncVideo();
    return audioEngine.subscribeVideoVoices(syncVideo);
  }, [layer.cueId]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !video) return;

    Object.assign(video.style, visualLayerSx);
    mount.appendChild(video);

    return () => {
      if (!video.isConnected) return;
      video.style.display = "none";
      document.body.appendChild(video);
    };
  }, [video]);

  useEffect(() => {
    if (video) video.style.opacity = String(clamp01(layer.opacity));
  }, [layer.opacity, video]);

  if (!video) {
    return <ControlVideoLayer layer={layer} onEnded={onEnded} />;
  }

  return <Box ref={mountRef} sx={{ width: "100%", height: "100%" }} />;
}

function ImageLayer({ layer }: { layer: OutputLayer }) {
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

interface VisualStageProps {
  layers: OutputLayer[];
  className?: string;
  sx?: SxProps<Theme>;
}

/** Composites active video/image layers in the control preview. */
export function VisualStage({ layers, className, sx }: VisualStageProps) {
  const { t } = useTranslation();
  const stopCue = useTransportStore((s) => s.stopCue);

  const handleEnded = useCallback(
    (cueId: string) => {
      stopCue(cueId);
    },
    [stopCue],
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
      {layers.length === 0 && (
        <Typography component="span" sx={visualStageEmptySx}>
          {t("output.noActiveVisualCues")}
        </Typography>
      )}
      {layers.map((layer, index) => (
        <Box key={layer.cueId} sx={{ ...visualLayerWrapSx, zIndex: index + 1 }}>
          {layer.type === "video" ? (
            <VideoLayer layer={layer} onEnded={handleEnded} />
          ) : (
            <ImageLayer layer={layer} />
          )}
        </Box>
      ))}
    </Box>
  );
}
