import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { type MediaWaveformKind, useMediaWaveform } from "../hooks/useMediaWaveform";
import { formatTime, normalizePlaybackRange } from "../lib/time";
import { getVideoThumbnailDataUrl } from "../lib/video-thumbnail";
import {
  waveformCanvasSx,
  waveformDraggingSx,
  waveformEditableSx,
  waveformHandleInSx,
  waveformHandleOutSx,
  waveformHandlesSx,
  waveformRootSx,
  waveformScrubSx,
  waveformSeekableSx,
  waveformStatusSx,
  waveformThumbnailSx,
  waveformThumbnailTimeSx,
} from "./audioWaveformSx";

export interface AudioWaveformProps {
  assetPath: string;
  inTime?: number;
  outTime?: number;
  /** Playhead position in the file (seconds); shown when active. */
  positionSec?: number;
  height?: number;
  className?: string;
  /** Allow dragging In / Out markers (inspector). */
  editable?: boolean;
  onRangeChange?: (patch: { inTime?: number; outTime?: number }) => void;
  mediaKind?: MediaWaveformKind;
  /** Video only — show frame thumbnail while hovering/scrubbing. */
  hoverPreview?: boolean;
  /** Click or drag on the waveform to jump playback (active cues). */
  seekable?: boolean;
  onSeek?: (positionSec: number) => void;
}

const END_SNAP_SEC = 0.05;
const MIN_SLICE_SEC = 0.1;

function snapTime(seconds: number): number {
  return Math.round(seconds * 100) / 100;
}

function readWaveformColors(canvas: HTMLCanvasElement) {
  const root = canvas.closest(".gsc-theme-root") ?? document.documentElement;
  const styles = getComputedStyle(root);
  return {
    track: styles.getPropertyValue("--border").trim() || "#333",
    dim: styles.getPropertyValue("--bg-hover").trim() || "rgba(128,128,128,0.25)",
    wave: styles.getPropertyValue("--success").trim() || "#4caf50",
    slice: styles.getPropertyValue("--accent").trim() || "#c9a227",
    playhead: styles.getPropertyValue("--accent").trim() || "#c9a227",
    scrub: styles.getPropertyValue("--text-muted").trim() || "#888",
  };
}

function drawWaveform(
  canvas: HTMLCanvasElement,
  peaks: Float32Array,
  durationSec: number,
  opts: {
    inTime: number;
    outTime: number | undefined;
    positionSec: number | undefined;
    hoverSec: number | undefined;
    height: number;
  },
) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = opts.height;
  if (width <= 0 || height <= 0) return;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const colors = readWaveformColors(canvas);
  const mid = height / 2;
  const inTime = Math.max(0, opts.inTime);
  const outTime =
    opts.outTime !== undefined
      ? Math.min(durationSec, Math.max(inTime, opts.outTime))
      : durationSec;

  ctx.fillStyle = colors.track;
  ctx.fillRect(0, 0, width, height);

  if (durationSec > 0) {
    const inX = (inTime / durationSec) * width;
    const outX = (outTime / durationSec) * width;
    ctx.fillStyle = colors.dim;
    ctx.fillRect(0, 0, inX, height);
    ctx.fillRect(outX, 0, width - outX, height);

    ctx.fillStyle = colors.slice;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(inX, 0, Math.max(0, outX - inX), height);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = colors.slice;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(inX + 0.5, 0);
    ctx.lineTo(inX + 0.5, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(outX + 0.5, 0);
    ctx.lineTo(outX + 0.5, height);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = colors.wave;
  const barW = Math.max(1, width / peaks.length);
  for (let i = 0; i < peaks.length; i++) {
    const x = (i / peaks.length) * width;
    const amp = peaks[i] * (height / 2 - 2);
    ctx.fillRect(x, mid - amp, barW, amp * 2);
  }

  if (opts.hoverSec !== undefined && durationSec > 0 && Number.isFinite(opts.hoverSec)) {
    const x = (opts.hoverSec / durationSec) * width;
    ctx.strokeStyle = colors.scrub;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (opts.positionSec !== undefined && durationSec > 0 && Number.isFinite(opts.positionSec)) {
    const x = (opts.positionSec / durationSec) * width;
    ctx.strokeStyle = colors.playhead;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
}

export function AudioWaveform({
  assetPath,
  inTime,
  outTime,
  positionSec,
  height = 56,
  className,
  editable = false,
  onRangeChange,
  mediaKind = "audio",
  hoverPreview = false,
  seekable = false,
  onSeek,
}: AudioWaveformProps) {
  const { t } = useTranslation();
  const { data, loading, missing } = useMediaWaveform(assetPath, mediaKind);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"in" | "out" | "seek" | null>(null);
  const seekThrottleRef = useRef(0);
  const [hoverSec, setHoverSec] = useState<number | null>(null);
  const [hoverPct, setHoverPct] = useState(0);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const thumbRequestRef = useRef(0);

  const durationSec = data?.durationSec ?? 0;
  const effectiveIn = inTime ?? 0;
  const effectiveOut =
    outTime !== undefined ? Math.min(durationSec, Math.max(effectiveIn, outTime)) : durationSec;

  const timeFromClientX = useCallback(
    (clientX: number): number => {
      const wrap = wrapRef.current;
      if (!wrap || !data) return effectiveIn;
      const rect = wrap.getBoundingClientRect();
      if (rect.width <= 0) return effectiveIn;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return snapTime(ratio * data.durationSec);
    },
    [data, effectiveIn],
  );

  const clampSeekTime = useCallback(
    (seconds: number): number => {
      return Math.max(effectiveIn, Math.min(effectiveOut, seconds));
    },
    [effectiveIn, effectiveOut],
  );

  const commitSeek = useCallback(
    (clientX: number, force = false) => {
      if (!seekable || !onSeek) return;
      const now = performance.now();
      if (!force && now - seekThrottleRef.current < 80) return;
      seekThrottleRef.current = now;
      onSeek(clampSeekTime(timeFromClientX(clientX)));
    },
    [clampSeekTime, onSeek, seekable, timeFromClientX],
  );

  const applyDrag = useCallback(
    (handle: "in" | "out", clientX: number) => {
      if (!data || !onRangeChange) return;

      const durationSec = data.durationSec;
      const currentIn = inTime ?? 0;
      const effectiveOut = outTime ?? durationSec;
      const t = timeFromClientX(clientX);

      if (handle === "in") {
        const maxIn = Math.max(0, effectiveOut - MIN_SLICE_SEC);
        const nextIn = Math.min(t, maxIn);
        onRangeChange({
          inTime: nextIn,
          outTime: normalizePlaybackRange(nextIn, outTime),
        });
        return;
      }

      if (t >= durationSec - END_SNAP_SEC) {
        onRangeChange({ outTime: undefined });
        return;
      }

      const minOut = currentIn + MIN_SLICE_SEC;
      onRangeChange({
        outTime: normalizePlaybackRange(currentIn, Math.max(minOut, t)),
      });
    },
    [data, inTime, onRangeChange, outTime, timeFromClientX],
  );

  const updateHover = useCallback(
    (clientX: number) => {
      if (!data || dragging) return;
      if (!hoverPreview && !seekable) return;

      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      if (rect.width <= 0) return;

      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const t = clampSeekTime(snapTime(ratio * data.durationSec));
      setHoverSec(t);
      setHoverPct(ratio * 100);

      if (!hoverPreview) return;

      const requestId = ++thumbRequestRef.current;
      void getVideoThumbnailDataUrl(assetPath, t).then((url) => {
        if (thumbRequestRef.current !== requestId) return;
        setThumbnailUrl(url);
      });
    },
    [assetPath, clampSeekTime, data, dragging, hoverPreview, seekable],
  );

  const clearHover = useCallback(() => {
    thumbRequestRef.current++;
    setHoverSec(null);
    setThumbnailUrl(null);
  }, []);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    drawWaveform(canvas, data.peaks, data.durationSec, {
      inTime: inTime ?? 0,
      outTime,
      positionSec,
      hoverSec:
        dragging === "seek" || (!dragging && hoverSec != null)
          ? (hoverSec ?? undefined)
          : undefined,
      height,
    });
  }, [data, dragging, height, hoverSec, inTime, outTime, positionSec]);

  useEffect(() => {
    paint();
  }, [paint]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => paint());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [paint]);

  const label = assetPath.split("/").pop() ?? assetPath;
  const inPct = durationSec > 0 ? (effectiveIn / durationSec) * 100 : 0;
  const outPct = durationSec > 0 ? (effectiveOut / durationSec) * 100 : 100;
  const showHandles = editable && !!data && !!onRangeChange;
  const showThumbnail = hoverPreview && hoverSec !== null && dragging !== "seek" && thumbnailUrl;
  const interactive = hoverPreview || seekable;

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragging === "seek") {
      const t = clampSeekTime(timeFromClientX(e.clientX));
      setHoverSec(t);
      commitSeek(e.clientX);
      return;
    }
    if (dragging) {
      applyDrag(dragging, e.clientX);
      return;
    }
    updateHover(e.clientX);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (dragging === "seek") {
      commitSeek(e.clientX, true);
      clearHover();
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(null);
  };

  const startSeek = (e: React.PointerEvent) => {
    if (!seekable || !onSeek || !data) return;
    if ((e.target as HTMLElement).closest("[data-waveform-handle]")) return;

    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging("seek");
    const t = clampSeekTime(timeFromClientX(e.clientX));
    setHoverSec(t);
    commitSeek(e.clientX, true);
  };

  return (
    <Box
      ref={wrapRef}
      className={className}
      title={label}
      role={seekable ? "slider" : undefined}
      aria-label={seekable ? t("playback.seekAria") : undefined}
      aria-valuemin={seekable ? Math.round(effectiveIn * 100) / 100 : undefined}
      aria-valuemax={seekable ? Math.round(effectiveOut * 100) / 100 : undefined}
      aria-valuenow={
        seekable && positionSec !== undefined ? Math.round(positionSec * 100) / 100 : undefined
      }
      sx={{
        ...waveformRootSx,
        height,
        ...(editable && waveformEditableSx),
        ...(hoverPreview && waveformScrubSx),
        ...(seekable && !hoverPreview && waveformSeekableSx),
        ...(dragging && waveformDraggingSx),
      }}
      onPointerDown={seekable ? startSeek : undefined}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerUp={interactive ? endDrag : undefined}
      onPointerCancel={interactive ? endDrag : undefined}
      onPointerLeave={interactive && dragging !== "seek" ? clearHover : undefined}
    >
      {loading && (
        <Typography component="span" sx={waveformStatusSx}>
          {mediaKind === "video" ? t("playback.loadingVideo") : t("playback.loadingWaveform")}
        </Typography>
      )}
      {missing && !loading && (
        <Typography component="span" sx={waveformStatusSx}>
          {t("playback.assetNotLoadedImport")}
        </Typography>
      )}
      {data && (
        <>
          <Box component="canvas" ref={canvasRef} aria-hidden sx={waveformCanvasSx} />
          {showThumbnail && (
            <Box sx={{ ...waveformThumbnailSx, left: `${hoverPct}%` }}>
              <Box component="img" src={thumbnailUrl} alt="" draggable={false} />
              <Typography component="span" sx={waveformThumbnailTimeSx}>
                {formatTime(hoverSec ?? 0)}
              </Typography>
            </Box>
          )}
          {showHandles && (
            <Box sx={waveformHandlesSx}>
              <Box
                data-waveform-handle
                sx={{ ...waveformHandleInSx, left: `${inPct}%` }}
                role="slider"
                aria-label={t("playback.inPointAria")}
                aria-valuemin={0}
                aria-valuemax={Math.round(effectiveOut * 100) / 100}
                aria-valuenow={Math.round(effectiveIn * 100) / 100}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  clearHover();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragging("in");
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
              <Box
                data-waveform-handle
                sx={{ ...waveformHandleOutSx, left: `${outPct}%` }}
                role="slider"
                aria-label={t("playback.outPointAria")}
                aria-valuemin={Math.round((effectiveIn + MIN_SLICE_SEC) * 100) / 100}
                aria-valuemax={Math.round(durationSec * 100) / 100}
                aria-valuenow={Math.round(effectiveOut * 100) / 100}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  clearHover();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragging("out");
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
