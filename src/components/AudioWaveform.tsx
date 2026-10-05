import CheckIcon from "@mui/icons-material/Check";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { Instance as PopperInstance } from "@popperjs/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type MediaWaveformKind,
  useMediaWaveform,
  useWaveformDetailPeaks,
} from "../hooks/useMediaWaveform";
import {
  clampMediaFadeSec,
  DEFAULT_MEDIA_FADE_CURVE,
  MEDIA_FADE_CURVES,
  mediaFadeGain,
} from "../lib/media-fade";
import { formatTime, normalizePlaybackRange } from "../lib/time";
import { getVideoThumbnailDataUrl } from "../lib/video-thumbnail";
import { WAVEFORM_MAX_ZOOM } from "../lib/waveform";
import type { MediaFadeCurve } from "../types/cue";
import {
  waveformCanvasSx,
  waveformDraggingSx,
  waveformEditableSx,
  waveformFadeHandleSx,
  waveformHandleInSx,
  waveformHandleOutSx,
  waveformHandlesSx,
  waveformRootSx,
  waveformScrubSx,
  waveformSeekableSx,
  waveformStatusSx,
  waveformThumbnailSx,
  waveformThumbnailTimeSx,
  waveformZoomableSx,
  waveformZoomLabelSx,
  waveformZoomPanSx,
  waveformZoomToolbarSx,
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
  /** Show zoom controls; Ctrl/⌘ + wheel zooms, Shift + wheel or drag pans (inspector). */
  zoomable?: boolean;
  /** Built-in fade lengths (seconds), drawn as an envelope over the slice. */
  fadeIn?: number;
  fadeOut?: number;
  fadeCurve?: MediaFadeCurve;
  /** Shows draggable fade handles when set together with `editable`; right-click picks the curve. */
  onFadeChange?: (patch: { fadeIn?: number; fadeOut?: number; fadeCurve?: MediaFadeCurve }) => void;
}

const FADE_CURVE_LABEL_KEYS: Record<MediaFadeCurve, string> = {
  linear: "inspector.fadeCurveLinear",
  equalPower: "inspector.fadeCurveEqualPower",
  sCurve: "inspector.fadeCurveSCurve",
  exponential: "inspector.fadeCurveExponential",
};

/** Fades shorter than this snap to zero while dragging. */
const FADE_SNAP_SEC = 0.05;
/** Arrow-key step for fade knobs; Shift multiplies by 10. */
const FADE_KEY_STEP_SEC = 0.1;

type DragTarget = "in" | "out" | "fadeIn" | "fadeOut" | "seek" | "pan";

const END_SNAP_SEC = 0.05;
const MIN_SLICE_SEC = 0.1;

const ZOOM_STEP = 2;
const WHEEL_ZOOM_SENSITIVITY = 0.01;

function snapTime(seconds: number): number {
  return Math.round(seconds * 100) / 100;
}

function clampZoom(zoom: number): number {
  return Math.max(1, Math.min(WAVEFORM_MAX_ZOOM, zoom));
}

/** Visible slice of the file: `span` seconds starting at `start`. */
interface WaveformView {
  start: number;
  span: number;
}

function clampViewStart(start: number, span: number, durationSec: number): number {
  return Math.max(0, Math.min(Math.max(0, durationSec - span), start));
}

/** Zoom to `zoom`, keeping the time under `anchorRatio` (0–1 across the view) in place. */
function zoomView(
  view: WaveformView,
  zoom: number,
  anchorRatio: number,
  durationSec: number,
): WaveformView {
  const span = durationSec / clampZoom(zoom);
  const anchorSec = view.start + anchorRatio * view.span;
  return { start: clampViewStart(anchorSec - anchorRatio * span, span, durationSec), span };
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
    view: WaveformView;
    fadeIn: number;
    fadeOut: number;
    fadeCurve: MediaFadeCurve;
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

  const { start: viewStart, span: viewSpan } = opts.view;
  const xOf = (seconds: number) => ((seconds - viewStart) / viewSpan) * width;

  ctx.fillStyle = colors.track;
  ctx.fillRect(0, 0, width, height);

  if (durationSec > 0 && viewSpan > 0) {
    const inX = Math.max(-1, Math.min(width + 1, xOf(inTime)));
    const outX = Math.max(-1, Math.min(width + 1, xOf(outTime)));
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
  if (durationSec > 0 && viewSpan > 0) {
    // One column per CSS pixel; each takes the max of the peak bins it covers.
    const binsPerSec = peaks.length / durationSec;
    const columns = Math.ceil(width);
    for (let x = 0; x < columns; x++) {
      const t0 = viewStart + (x / width) * viewSpan;
      const t1 = viewStart + ((x + 1) / width) * viewSpan;
      const i0 = Math.min(peaks.length - 1, Math.floor(t0 * binsPerSec));
      const i1 = Math.min(peaks.length, Math.max(i0 + 1, Math.floor(t1 * binsPerSec)));
      let peak = 0;
      for (let i = i0; i < i1; i++) if (peaks[i] > peak) peak = peaks[i];
      const amp = peak * (height / 2 - 2);
      ctx.fillRect(x, mid - amp, 1, amp * 2);
    }
  }

  if ((opts.fadeIn > 0 || opts.fadeOut > 0) && durationSec > 0 && viewSpan > 0) {
    drawFadeEnvelope(ctx, {
      inTime,
      outTime,
      fadeIn: opts.fadeIn,
      fadeOut: opts.fadeOut,
      curve: opts.fadeCurve,
      width,
      height,
      xOf,
      colors,
    });
  }

  if (opts.hoverSec !== undefined && durationSec > 0 && Number.isFinite(opts.hoverSec)) {
    const x = xOf(opts.hoverSec);
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
    const x = xOf(opts.positionSec);
    ctx.strokeStyle = colors.playhead;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
}

/** Shade the faded-out area above the envelope and stroke the envelope line. */
function drawFadeEnvelope(
  ctx: CanvasRenderingContext2D,
  opts: {
    inTime: number;
    outTime: number;
    fadeIn: number;
    fadeOut: number;
    curve: MediaFadeCurve;
    width: number;
    height: number;
    xOf: (seconds: number) => number;
    colors: ReturnType<typeof readWaveformColors>;
  },
) {
  const { inTime, outTime, width, height, xOf, colors } = opts;
  const sliceSec = outTime - inTime;
  if (sliceSec <= 0) return;
  const envelope = {
    fadeInSec: opts.fadeIn,
    fadeOutSec: opts.fadeOut,
    curve: opts.curve,
    totalRunSec: sliceSec,
  };
  const x0 = Math.max(0, xOf(inTime));
  const x1 = Math.min(width, xOf(outTime));
  if (x1 <= x0) return;
  const pad = 1;
  const yOf = (gain: number) => pad + (1 - gain) * (height - pad * 2);
  const timeOf = (x: number) =>
    inTime + ((x - xOf(inTime)) / (xOf(outTime) - xOf(inTime))) * sliceSec;

  const points: [number, number][] = [];
  for (let x = x0; x <= x1; x += 1) {
    points.push([x, yOf(mediaFadeGain(envelope, timeOf(x) - inTime))]);
  }
  points.push([x1, yOf(mediaFadeGain(envelope, timeOf(x1) - inTime))]);

  ctx.fillStyle = colors.dim;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(x0, 0);
  for (const [x, y] of points) ctx.lineTo(x, y);
  ctx.lineTo(x1, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = colors.slice;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

interface FadeHandleProps {
  handle: "fadeIn" | "fadeOut";
  pct: number;
  value: number;
  maxSec: number;
  dragging: boolean;
  curve: MediaFadeCurve;
  onCurveChange: (curve: MediaFadeCurve) => void;
  onStep: (nextSec: number) => void;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

/** Round fade knob; its length shows in a tooltip while hovered, focused or dragged. */
function FadeHandle({
  handle,
  pct,
  value,
  maxSec,
  dragging,
  curve,
  onCurveChange,
  onStep,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: FadeHandleProps) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [menu, setMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const popperRef = useRef<PopperInstance | null>(null);
  const seconds = Math.round(value * 100) / 100;

  // The knob moves while dragging; keep the tooltip attached to it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reposition when the knob moves
  useEffect(() => {
    void popperRef.current?.update();
  }, [pct]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? FADE_KEY_STEP_SEC * 10 : FADE_KEY_STEP_SEC;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = value + step;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = value - step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = maxSec;
    if (next === null) return;
    e.preventDefault();
    onStep(Math.max(0, Math.min(maxSec, next)));
  };

  const openMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // The context-menu key reports 0,0; anchor to the knob instead.
    const rect = e.currentTarget.getBoundingClientRect();
    const fromKeyboard = e.clientX === 0 && e.clientY === 0;
    setMenu({
      mouseX: fromKeyboard ? rect.left + rect.width / 2 : e.clientX,
      mouseY: fromKeyboard ? rect.bottom : e.clientY,
    });
  };

  return (
    <>
      <Tooltip
        title={t(handle === "fadeIn" ? "playback.fadeInTooltip" : "playback.fadeOutTooltip", {
          seconds,
        })}
        open={(hovered || focused || dragging) && menu === null}
        placement="top"
        arrow
        disableInteractive
        slotProps={{ popper: { popperRef } }}
      >
        <Box
          data-waveform-handle
          data-waveform-fade-handle={handle}
          sx={{
            ...waveformFadeHandleSx,
            left: `${pct}%`,
            // Sit inside the fade so the knob stays grabbable at the edges.
            ml: handle === "fadeIn" ? 0 : "-12px",
          }}
          role="slider"
          tabIndex={0}
          aria-label={t(handle === "fadeIn" ? "playback.fadeInAria" : "playback.fadeOutAria")}
          aria-valuemin={0}
          aria-valuemax={Math.round(maxSec * 100) / 100}
          aria-valuenow={seconds}
          aria-valuetext={t(
            handle === "fadeIn" ? "playback.fadeInTooltip" : "playback.fadeOutTooltip",
            { seconds },
          )}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          onContextMenu={openMenu}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </Tooltip>
      <Menu
        open={menu !== null}
        onClose={() => setMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={menu ? { top: menu.mouseY, left: menu.mouseX } : undefined}
        slotProps={{ list: { "aria-label": t("inspector.fadeCurve"), dense: true } }}
      >
        <ListSubheader sx={{ lineHeight: "28px" }}>{t("inspector.fadeCurve")}</ListSubheader>
        {MEDIA_FADE_CURVES.map((option) => (
          <MenuItem
            key={option}
            role="menuitemradio"
            aria-checked={option === curve}
            selected={option === curve}
            onClick={() => {
              onCurveChange(option);
              setMenu(null);
            }}
          >
            <ListItemIcon>{option === curve && <CheckIcon fontSize="small" />}</ListItemIcon>
            <ListItemText>{t(FADE_CURVE_LABEL_KEYS[option])}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
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
  zoomable = false,
  fadeIn = 0,
  fadeOut = 0,
  fadeCurve = DEFAULT_MEDIA_FADE_CURVE,
  onFadeChange,
}: AudioWaveformProps) {
  const { t } = useTranslation();
  const { data, loading, missing } = useMediaWaveform(assetPath, mediaKind);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DragTarget | null>(null);
  const [zoom, setZoom] = useState(1);
  const [viewStartSec, setViewStartSec] = useState(0);
  const panOriginRef = useRef<{ clientX: number; viewStart: number } | null>(null);
  /** Pointer distance from the fade point when a fade knob was grabbed (px). */
  const fadeGrabOffsetRef = useRef(0);
  const detailPeaks = useWaveformDetailPeaks(assetPath, zoomable && zoom > 1);
  const seekThrottleRef = useRef(0);
  const [hoverSec, setHoverSec] = useState<number | null>(null);
  const [hoverPct, setHoverPct] = useState(0);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const thumbRequestRef = useRef(0);

  const durationSec = data?.durationSec ?? 0;
  const effectiveIn = inTime ?? 0;
  const effectiveOut =
    outTime !== undefined ? Math.min(durationSec, Math.max(effectiveIn, outTime)) : durationSec;
  const viewSpan = durationSec / (zoomable ? zoom : 1);
  const viewStart = zoomable ? clampViewStart(viewStartSec, viewSpan, durationSec) : 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset zoom when the file changes
  useEffect(() => {
    setZoom(1);
    setViewStartSec(0);
  }, [assetPath]);

  const ratioFromClientX = useCallback((clientX: number): number | null => {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    if (rect.width <= 0) return null;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const timeFromClientX = useCallback(
    (clientX: number): number => {
      const ratio = ratioFromClientX(clientX);
      if (!data || ratio === null) return effectiveIn;
      return snapTime(viewStart + ratio * viewSpan);
    },
    [data, effectiveIn, ratioFromClientX, viewSpan, viewStart],
  );

  const applyZoom = useCallback(
    (nextZoom: number, anchorRatio = 0.5) => {
      if (durationSec <= 0) return;
      const clamped = clampZoom(nextZoom);
      const next = zoomView(
        { start: viewStart, span: viewSpan },
        clamped,
        anchorRatio,
        durationSec,
      );
      setZoom(clamped);
      setViewStartSec(next.start);
    },
    [durationSec, viewSpan, viewStart],
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!zoomable || !wrap || durationSec <= 0) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const ratio = ratioFromClientX(e.clientX) ?? 0.5;
        applyZoom(zoom * Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY), ratio);
        return;
      }
      if (zoom <= 1) return;
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!horizontal && !e.shiftKey) return;
      const delta = horizontal ? e.deltaX : e.deltaY;
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      if (rect.width <= 0) return;
      setViewStartSec(
        clampViewStart(viewStart + (delta / rect.width) * viewSpan, viewSpan, durationSec),
      );
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => wrap.removeEventListener("wheel", onWheel);
  }, [applyZoom, durationSec, ratioFromClientX, viewSpan, viewStart, zoom, zoomable]);

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

  const applyFadeDrag = useCallback(
    (handle: "fadeIn" | "fadeOut", clientX: number) => {
      if (!data || !onFadeChange) return;
      const sliceSec = effectiveOut - effectiveIn;
      const t = timeFromClientX(clientX - fadeGrabOffsetRef.current);
      const raw = handle === "fadeIn" ? t - effectiveIn : effectiveOut - t;
      const next = clampMediaFadeSec(
        raw < FADE_SNAP_SEC ? 0 : snapTime(raw),
        handle === "fadeIn" ? fadeOut : fadeIn,
        sliceSec,
      );
      onFadeChange(handle === "fadeIn" ? { fadeIn: next } : { fadeOut: next });
    },
    [data, effectiveIn, effectiveOut, fadeIn, fadeOut, onFadeChange, timeFromClientX],
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
      const t = clampSeekTime(snapTime(viewStart + ratio * viewSpan));
      setHoverSec(t);
      setHoverPct(ratio * 100);

      if (!hoverPreview) return;

      const requestId = ++thumbRequestRef.current;
      void getVideoThumbnailDataUrl(assetPath, t).then((url) => {
        if (thumbRequestRef.current !== requestId) return;
        setThumbnailUrl(url);
      });
    },
    [assetPath, clampSeekTime, data, dragging, hoverPreview, seekable, viewSpan, viewStart],
  );

  const clearHover = useCallback(() => {
    thumbRequestRef.current++;
    setHoverSec(null);
    setThumbnailUrl(null);
  }, []);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    drawWaveform(canvas, detailPeaks ?? data.peaks, data.durationSec, {
      inTime: inTime ?? 0,
      outTime,
      positionSec,
      hoverSec:
        dragging === "seek" || (!dragging && hoverSec != null)
          ? (hoverSec ?? undefined)
          : undefined,
      height,
      view: { start: viewStart, span: viewSpan },
      fadeIn,
      fadeOut,
      fadeCurve,
    });
  }, [
    data,
    detailPeaks,
    dragging,
    fadeCurve,
    fadeIn,
    fadeOut,
    height,
    hoverSec,
    inTime,
    outTime,
    positionSec,
    viewSpan,
    viewStart,
  ]);

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
  const pctOf = (seconds: number) => (viewSpan > 0 ? ((seconds - viewStart) / viewSpan) * 100 : 0);
  const inPct = durationSec > 0 ? pctOf(effectiveIn) : 0;
  const outPct = durationSec > 0 ? pctOf(effectiveOut) : 100;
  const inVisible = inPct >= 0 && inPct <= 100;
  const outVisible = outPct >= 0 && outPct <= 100;
  const showHandles = editable && !!data && !!onRangeChange;
  const showFadeHandles = editable && !!data && !!onFadeChange;
  const fadeInPct = pctOf(effectiveIn + fadeIn);
  const fadeOutPct = pctOf(effectiveOut - fadeOut);
  const showThumbnail =
    hoverPreview && hoverSec !== null && dragging !== "seek" && dragging !== "pan" && thumbnailUrl;
  const pannable = zoomable && zoom > 1 && !seekable;
  const interactive = hoverPreview || seekable || pannable;

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragging === "pan") {
      const origin = panOriginRef.current;
      const width = wrapRef.current?.getBoundingClientRect().width ?? 0;
      if (!origin || width <= 0) return;
      const deltaSec = ((origin.clientX - e.clientX) / width) * viewSpan;
      setViewStartSec(clampViewStart(origin.viewStart + deltaSec, viewSpan, durationSec));
      return;
    }
    if (dragging === "seek") {
      const t = clampSeekTime(timeFromClientX(e.clientX));
      setHoverSec(t);
      commitSeek(e.clientX);
      return;
    }
    if (dragging === "fadeIn" || dragging === "fadeOut") {
      applyFadeDrag(dragging, e.clientX);
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
    panOriginRef.current = null;
    setDragging(null);
  };

  const startPan = (e: React.PointerEvent) => {
    if (!pannable || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-waveform-handle]")) return;
    e.preventDefault();
    clearHover();
    e.currentTarget.setPointerCapture(e.pointerId);
    panOriginRef.current = { clientX: e.clientX, viewStart };
    setDragging("pan");
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

  const waveform = (
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
        ...(pannable && waveformZoomableSx),
        ...(dragging && waveformDraggingSx),
      }}
      onPointerDown={seekable ? startSeek : pannable ? startPan : undefined}
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
          {(showHandles || showFadeHandles) && (
            <Box sx={waveformHandlesSx}>
              {showFadeHandles &&
                (["fadeIn", "fadeOut"] as const).map((handle) => {
                  const pct = handle === "fadeIn" ? fadeInPct : fadeOutPct;
                  if (pct < 0 || pct > 100) return null;
                  const value = handle === "fadeIn" ? fadeIn : fadeOut;
                  const other = handle === "fadeIn" ? fadeOut : fadeIn;
                  const sliceSec = effectiveOut - effectiveIn;
                  return (
                    <FadeHandle
                      key={handle}
                      handle={handle}
                      pct={pct}
                      value={value}
                      maxSec={Math.max(0, sliceSec - other)}
                      dragging={dragging === handle}
                      curve={fadeCurve}
                      onCurveChange={(fadeCurve) => onFadeChange?.({ fadeCurve })}
                      onStep={(next) =>
                        onFadeChange?.({
                          [handle]: clampMediaFadeSec(snapTime(next), other, sliceSec),
                        })
                      }
                      onPointerDown={(e) => {
                        // Leave right-click to the curve menu.
                        if (e.button !== 0) return;
                        e.preventDefault();
                        e.stopPropagation();
                        clearHover();
                        const rect = wrapRef.current?.getBoundingClientRect();
                        fadeGrabOffsetRef.current = rect
                          ? e.clientX - (rect.left + (pct / 100) * rect.width)
                          : 0;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setDragging(handle);
                      }}
                      onPointerMove={handlePointerMove}
                      onPointerUp={endDrag}
                    />
                  );
                })}
              {showHandles && inVisible && (
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
              )}
              {showHandles && outVisible && (
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
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );

  if (!zoomable) return waveform;

  const panMax = Math.max(0, durationSec - viewSpan);
  return (
    <Box>
      {waveform}
      {data && (
        <Box sx={waveformZoomToolbarSx}>
          <IconButton
            size="small"
            title={t("playback.zoomOut")}
            aria-label={t("playback.zoomOut")}
            disabled={zoom <= 1}
            onClick={() => applyZoom(zoom / ZOOM_STEP)}
          >
            <ZoomOutIcon fontSize="inherit" />
          </IconButton>
          <IconButton
            size="small"
            title={t("playback.zoomIn")}
            aria-label={t("playback.zoomIn")}
            disabled={zoom >= WAVEFORM_MAX_ZOOM}
            onClick={() => applyZoom(zoom * ZOOM_STEP)}
          >
            <ZoomInIcon fontSize="inherit" />
          </IconButton>
          <IconButton
            size="small"
            title={t("playback.zoomFit")}
            aria-label={t("playback.zoomFit")}
            disabled={zoom <= 1}
            onClick={() => applyZoom(1)}
          >
            <ZoomOutMapIcon fontSize="inherit" />
          </IconButton>
          <Typography component="span" sx={waveformZoomLabelSx}>
            {t("playback.zoomLevel", { zoom: zoom < 10 ? zoom.toFixed(1) : Math.round(zoom) })}
          </Typography>
          <Slider
            size="small"
            min={0}
            max={panMax || 1}
            step={viewSpan / 100 || 0.01}
            value={viewStart}
            disabled={zoom <= 1}
            aria-label={t("playback.zoomPanAria")}
            valueLabelDisplay="off"
            onChange={(_, value) =>
              setViewStartSec(clampViewStart(value as number, viewSpan, durationSec))
            }
            sx={waveformZoomPanSx}
          />
        </Box>
      )}
    </Box>
  );
}
