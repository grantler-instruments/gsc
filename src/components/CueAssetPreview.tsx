import { useEffect, useRef } from "react";
import { resolveEffectiveOpacity } from "../stores/fade";
import { useFadeStore } from "../stores/fade";
import { vfsGetObjectUrl } from "../vfs/engine";
import type { Cue } from "../types/cue";

interface CueAssetPreviewProps {
  cue: Cue;
  className?: string;
}

/** Static preview of a video/image cue asset in the inspector. */
export function CueAssetPreview({ cue, className }: CueAssetPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameMs = useFadeStore((s) => s.frameMs);

  if (!cue.assetPath || (cue.type !== "video" && cue.type !== "image")) {
    return null;
  }

  const objectUrl = vfsGetObjectUrl(cue.assetPath);
  if (!objectUrl) {
    return (
      <div className={["cue-asset-preview", "cue-asset-preview-missing", className]
        .filter(Boolean)
        .join(" ")}
      >
        Asset not loaded — re-import after opening a project.
      </div>
    );
  }

  const inTime = cue.inTime ?? 0;
  const opacity = resolveEffectiveOpacity(cue.id, cue.opacity ?? 1, frameMs);

  if (cue.type === "image") {
    return (
      <div className={["cue-asset-preview", className].filter(Boolean).join(" ")}>
        <img
          className="cue-asset-preview-media"
          src={objectUrl}
          alt=""
          style={{ opacity }}
        />
      </div>
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
    <div className={["cue-asset-preview", className].filter(Boolean).join(" ")}>
      <video
        ref={videoRef}
        className="cue-asset-preview-media"
        playsInline
        muted
        style={{ opacity }}
      />
    </div>
  );
}
