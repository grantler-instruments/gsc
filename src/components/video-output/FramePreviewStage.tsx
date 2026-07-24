import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAssetObjectUrl } from "../../hooks/useAssetObjectUrl";
import {
  attachTransportSyncedVideo,
  type TransportVideoSyncAttachment,
  transportTimingFromOutputLayer,
} from "../../lib/transport-synced-video";
import { normalizeVideoOutputFrame } from "../../lib/video-output-frame";
import { resolveEffectiveOpacity, useFadeStore } from "../../stores/fade";
import { useVfsStore } from "../../stores/vfs";
import type { OutputLayer } from "../../types/output";
import type { VideoEffect } from "../../types/video-effect";
import type { VideoOutputFrame } from "../../types/video-output-frame";
import { vfsGetObjectUrl } from "../../vfs/engine";
import { visualStageEmptySx } from "../visualStageSx";
import { FrameWarpPreview } from "./FrameWarpPreview";
import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from "./frame-panel-layout";

export interface VideoOutputFramePreviewSource {
  layers: OutputLayer[];
  busEffects?: VideoEffect[];
  busOpacity?: number;
}

function livePreviewLayers(preview: VideoOutputFramePreviewSource, frameMs: number): OutputLayer[] {
  const dimmer = preview.busOpacity ?? 1;
  return preview.layers.map((layer) => ({
    ...layer,
    opacity: resolveEffectiveOpacity(layer.cueId, layer.opacity, frameMs) * dimmer,
  }));
}

/** Compositor layers — match VisualMonitor (bus dimmer applied once in the compositor). */
function compositorPreviewLayers(
  preview: VideoOutputFramePreviewSource,
  frameMs: number,
): OutputLayer[] {
  return preview.layers.map((layer) => ({
    ...layer,
    objectUrl: layer.objectUrl || vfsGetObjectUrl(layer.assetPath) || "",
    opacity: resolveEffectiveOpacity(layer.cueId, layer.opacity, frameMs),
  }));
}

function FramePreviewLayer({ layer, zIndex }: { layer: OutputLayer; zIndex: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const layerRef = useRef(layer);
  const syncRef = useRef<TransportVideoSyncAttachment | null>(null);
  const fallbackUrl = useAssetObjectUrl(layer.assetPath);
  const objectUrl = layer.objectUrl || fallbackUrl || "";
  layerRef.current = layer;

  useEffect(() => {
    if (layer.type !== "video" || !objectUrl) return;
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = objectUrl;

    const sync = attachTransportSyncedVideo(video, () =>
      transportTimingFromOutputLayer(layerRef.current),
    );
    syncRef.current = sync;

    const startPlayback = () => {
      sync.seekAndPlay();
    };

    video.addEventListener("loadedmetadata", startPlayback);
    video.addEventListener("canplay", startPlayback);
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) startPlayback();

    return () => {
      sync.detach();
      syncRef.current = null;
      video.removeEventListener("loadedmetadata", startPlayback);
      video.removeEventListener("canplay", startPlayback);
      video.removeAttribute("src");
      video.load();
    };
  }, [
    layer.assetPath,
    layer.cueId,
    layer.inTime,
    layer.loopCount,
    layer.sliceSec,
    layer.type,
    objectUrl,
  ]);

  useEffect(() => {
    const sync = syncRef.current;
    if (!sync) return;
    sync.resetState();
    sync.seekToClock();
  }, [layer.goAtMs, layer.inTime, layer.sliceSec, layer.loopCount]);

  if (!objectUrl) return null;

  const mediaStyle = {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain" as const,
    display: "block",
    opacity: layer.opacity,
    zIndex,
    pointerEvents: "none" as const,
  };

  if (layer.type === "image") {
    return <Box component="img" src={objectUrl} alt="" sx={mediaStyle} />;
  }

  return <Box component="video" ref={videoRef} muted playsInline autoPlay sx={mediaStyle} />;
}

function FramePreviewLayerStack({ layers }: { layers: OutputLayer[] }) {
  return (
    <Box sx={{ position: "absolute", inset: 0 }}>
      {layers.map((layer, index) => (
        <FramePreviewLayer key={layer.cueId} layer={layer} zIndex={index + 1} />
      ))}
    </Box>
  );
}

export function FramePreviewStage({ preview }: { preview: VideoOutputFramePreviewSource }) {
  const { t } = useTranslation();
  const frameMs = useFadeStore((s) => s.frameMs);
  const layers = useMemo(
    () => livePreviewLayers(preview, frameMs),
    [preview.layers, preview.busOpacity, frameMs],
  );

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        bgcolor: "#000",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {preview.layers.length === 0 ? (
        <Typography component="span" sx={visualStageEmptySx}>
          {t("videoOutput.frameNoPreview")}
        </Typography>
      ) : (
        <FramePreviewLayerStack layers={layers} />
      )}
    </Box>
  );
}

export function FrameWarpPreviewStage({
  preview,
  outputFrame,
}: {
  preview: VideoOutputFramePreviewSource;
  outputFrame: VideoOutputFrame;
}) {
  const { t } = useTranslation();
  const frameMs = useFadeStore((s) => s.frameMs);
  const vfsLoadedKey = useVfsStore((s) =>
    s.entries.map((entry) => `${entry.path}:${entry.loaded}`).join("|"),
  );
  const layers = useMemo(
    () => compositorPreviewLayers(preview, frameMs),
    [preview.layers, frameMs, vfsLoadedKey],
  );
  const mappedFrame = useMemo(() => normalizeVideoOutputFrame(outputFrame), [outputFrame]);

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        bgcolor: "#000",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {preview.layers.length === 0 ? (
        <Typography component="span" sx={visualStageEmptySx}>
          {t("videoOutput.frameNoPreview")}
        </Typography>
      ) : (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            width: PREVIEW_WIDTH,
            height: PREVIEW_HEIGHT,
            pointerEvents: "none",
            "& canvas": { pointerEvents: "none", display: "block" },
          }}
        >
          <FrameWarpPreview
            layers={layers}
            outputFrame={mappedFrame}
            busOpacity={preview.busOpacity ?? 1}
            width={PREVIEW_WIDTH}
            height={PREVIEW_HEIGHT}
          />
        </Box>
      )}
    </Box>
  );
}
