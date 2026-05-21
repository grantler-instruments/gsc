import { useCallback, useEffect, useRef } from "react";
import { useTransportStore } from "../stores/transport";
import type { OutputLayer } from "../types/output";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function elapsedInSlice(layer: OutputLayer): number {
  const elapsedSec = Math.max(0, (performance.now() - layer.goAtMs) / 1000);
  if (layer.loopCount === "inf") {
    return layer.sliceSec > 0 ? elapsedSec % layer.sliceSec : 0;
  }
  const totalSec = layer.sliceSec * layer.loopCount;
  return Math.min(elapsedSec, totalSec);
}

function positionInSource(layer: OutputLayer): number {
  const inSlice = elapsedInSlice(layer);
  if (layer.loopCount === "inf") {
    return layer.inTime + inSlice;
  }
  const within = layer.sliceSec > 0 ? inSlice % layer.sliceSec : 0;
  return layer.inTime + within;
}

function isPlaybackComplete(layer: OutputLayer): boolean {
  if (layer.loopCount === "inf") return false;
  const elapsedSec = Math.max(0, (performance.now() - layer.goAtMs) / 1000);
  return elapsedSec >= layer.sliceSec * layer.loopCount;
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

      const target = positionInSource(current);
      if (Number.isFinite(target) && Math.abs(video.currentTime - target) > 0.04) {
        try {
          video.currentTime = target;
        } catch {
          /* seek not ready */
        }
      }

      if (
        !completedRef.current &&
        current.loopCount !== "inf" &&
        isPlaybackComplete(current)
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

    const onError = () => {
      console.warn("[video] Could not load", layer.objectUrl);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("error", onError);

    if (video.readyState >= 1) {
      onLoadedMetadata();
    } else {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(rafId);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
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
    <video
      ref={ref}
      className="visual-layer visual-layer-video"
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
      className="visual-layer visual-layer-image"
      src={layer.objectUrl}
      alt=""
      style={{ opacity: clamp01(layer.opacity) }}
    />
  );
}

export type VisualStageRole = "control" | "output";

interface VisualStageProps {
  layers: OutputLayer[];
  role: VisualStageRole;
  className?: string;
}

/** Composites active video/image layers (picture only — audio via Web Audio in control app). */
export function VisualStage({ layers, role, className }: VisualStageProps) {
  const stopCue = useTransportStore((s) => s.stopCue);

  const handleEnded = useCallback(
    (cueId: string) => {
      if (role === "control") {
        stopCue(cueId);
      }
    },
    [role, stopCue],
  );

  const classes = ["visual-stage", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {layers.map((layer, index) => (
        <div
          key={layer.cueId}
          className="visual-layer-wrap"
          style={{ zIndex: index + 1 }}
        >
          {layer.type === "video" ? (
            <VideoLayer
              layer={layer}
              onEnded={role === "control" ? handleEnded : undefined}
            />
          ) : (
            <ImageLayer layer={layer} />
          )}
        </div>
      ))}
    </div>
  );
}
