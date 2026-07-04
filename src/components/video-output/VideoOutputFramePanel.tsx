import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAssetObjectUrl } from "../../hooks/useAssetObjectUrl";
import {
  attachTransportSyncedVideo,
  type TransportVideoSyncAttachment,
  transportTimingFromOutputLayer,
} from "../../lib/transport-synced-video";
import {
  applyLinkedDestQuadSize,
  defaultVideoOutputFrame,
  isIdentityVideoOutputFrame,
  normalizeNormalizedRect,
  normalizeVideoOutputFrame,
  patchNormalizedQuadCorner,
  patchNormalizedQuadFromRect,
  quadToBoundingRect,
  rectToQuad,
  translateNormalizedQuad,
} from "../../lib/video-output-frame";
import { resolveEffectiveOpacity, useFadeStore } from "../../stores/fade";
import { useVfsStore } from "../../stores/vfs";
import type { OutputLayer } from "../../types/output";
import type { VideoEffect } from "../../types/video-effect";
import type {
  NormalizedPoint,
  NormalizedQuad,
  NormalizedRect,
  QuadCorner,
  VideoOutputFrame,
} from "../../types/video-output-frame";
import { vfsGetObjectUrl } from "../../vfs/engine";
import { visualStageEmptySx } from "../visualStageSx";
import { FrameWarpPreview } from "./FrameWarpPreview";

export const EDITOR_COLUMN_WIDTH = 220;
export const FRAME_PANEL_WIDTH = EDITOR_COLUMN_WIDTH * 2 + 24;

const PREVIEW_WIDTH = EDITOR_COLUMN_WIDTH;
const PREVIEW_HEIGHT = 115;
const MIN_DRAG_SIZE = 0.08;

const QUAD_CORNERS: QuadCorner[] = ["tl", "tr", "br", "bl"];
type RectField = keyof NormalizedRect;
type RectDragMode = "move" | "resize-se" | "resize-nw";
type QuadDragMode = "move" | QuadCorner;

const RECT_FIELD_SX = {
  flex: "1 1 46%",
  minWidth: 0,
  "& .MuiInputBase-root": { fontSize: 10 },
  "& .MuiInputBase-input": { py: 0.25, px: 0.5, textAlign: "right" },
  "& .MuiInputLabel-root": { fontSize: 10 },
};

function formatRectPercent(value: number): string {
  return (value * 100).toFixed(1);
}

function parseRectPercentInput(value: string): number | undefined {
  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.min(100, parsed)) / 100;
}

function quadPolygonPoints(quad: NormalizedQuad): string {
  return QUAD_CORNERS.map((corner) => `${quad[corner].x * 100},${quad[corner].y * 100}`).join(" ");
}

function cropDimClipPath(rect: NormalizedRect): string {
  const x1 = rect.x * 100;
  const y1 = rect.y * 100;
  const x2 = (rect.x + rect.w) * 100;
  const y2 = (rect.y + rect.h) * 100;
  return `polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${x1}% ${y1}%, ${x2}% ${y1}%, ${x2}% ${y2}%, ${x1}% ${y2}%, ${x1}% ${y1}%)`;
}

function resizeRectFromCorner(
  origin: NormalizedRect,
  dx: number,
  dy: number,
  corner: "se" | "nw",
): NormalizedRect {
  if (corner === "se") {
    return normalizeNormalizedRect({
      x: origin.x,
      y: origin.y,
      w: Math.max(MIN_DRAG_SIZE, origin.w + dx),
      h: Math.max(MIN_DRAG_SIZE, origin.h + dy),
    });
  }

  let nextX = origin.x + dx;
  let nextY = origin.y + dy;
  let nextW = origin.w - dx;
  let nextH = origin.h - dy;

  if (nextW < MIN_DRAG_SIZE) {
    nextX = origin.x + origin.w - MIN_DRAG_SIZE;
    nextW = MIN_DRAG_SIZE;
  }
  if (nextH < MIN_DRAG_SIZE) {
    nextY = origin.y + origin.h - MIN_DRAG_SIZE;
    nextH = MIN_DRAG_SIZE;
  }

  return normalizeNormalizedRect({
    x: nextX,
    y: nextY,
    w: nextW,
    h: nextH,
  });
}

function RectPercentField({
  label,
  value,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(() => formatRectPercent(value));

  useEffect(() => {
    setDraft(formatRectPercent(value));
  }, [value]);

  const commitDraft = useCallback(() => {
    const parsed = parseRectPercentInput(draft);
    if (parsed === undefined) {
      setDraft(formatRectPercent(value));
      return;
    }
    onCommit(parsed);
  }, [draft, onCommit, value]);

  return (
    <TextField
      label={label}
      size="small"
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      slotProps={{
        input: {
          endAdornment: (
            <Typography component="span" sx={{ fontSize: 10, color: "text.secondary", pl: 0.25 }}>
              %
            </Typography>
          ),
        },
      }}
      sx={RECT_FIELD_SX}
    />
  );
}

function RectValueFields({
  rect,
  disabled,
  lockSize,
  onChange,
}: {
  rect: NormalizedRect;
  disabled: boolean;
  lockSize?: boolean;
  onChange: (rect: NormalizedRect) => void;
}) {
  const { t } = useTranslation();

  const patchField = useCallback(
    (field: RectField, value: number) => {
      onChange(normalizeNormalizedRect({ ...rect, [field]: value }));
    },
    [onChange, rect],
  );

  return (
    <Stack direction="row" useFlexGap spacing={0.5} sx={{ pt: 0.25, flexWrap: "wrap" }}>
      <RectPercentField
        label={t("videoOutput.frameX")}
        value={rect.x}
        disabled={disabled}
        onCommit={(value) => patchField("x", value)}
      />
      <RectPercentField
        label={t("videoOutput.frameY")}
        value={rect.y}
        disabled={disabled}
        onCommit={(value) => patchField("y", value)}
      />
      <RectPercentField
        label={t("videoOutput.frameW")}
        value={rect.w}
        disabled={disabled || Boolean(lockSize)}
        onCommit={(value) => patchField("w", value)}
      />
      <RectPercentField
        label={t("videoOutput.frameH")}
        value={rect.h}
        disabled={disabled || Boolean(lockSize)}
        onCommit={(value) => patchField("h", value)}
      />
    </Stack>
  );
}

function QuadValueFields({
  quad,
  disabled,
  lockSize,
  onChange,
}: {
  quad: NormalizedQuad;
  disabled: boolean;
  lockSize?: boolean;
  onChange: (quad: NormalizedQuad) => void;
}) {
  const rect = quadToBoundingRect(quad);
  return (
    <RectValueFields
      rect={rect}
      disabled={disabled}
      lockSize={lockSize}
      onChange={(next) => onChange(patchNormalizedQuadFromRect(quad, next))}
    />
  );
}

export interface VideoOutputFramePreviewSource {
  layers: OutputLayer[];
  busEffects?: VideoEffect[];
  busOpacity?: number;
}

interface FramePreviewStageProps {
  preview: VideoOutputFramePreviewSource;
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

function FramePreviewStage({ preview }: FramePreviewStageProps) {
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

interface FrameWarpPreviewStageProps {
  preview: VideoOutputFramePreviewSource;
  outputFrame: VideoOutputFrame;
}

function FrameWarpPreviewStage({ preview, outputFrame }: FrameWarpPreviewStageProps) {
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

function pointerToNormalized(clientX: number, clientY: number, bounds: DOMRect): NormalizedPoint {
  return {
    x: Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)),
    y: Math.max(0, Math.min(1, (clientY - bounds.top) / bounds.height)),
  };
}

interface RectEditorProps {
  label: string;
  rect: NormalizedRect;
  color: string;
  disabled: boolean;
  preview: VideoOutputFramePreviewSource;
  onChange: (rect: NormalizedRect) => void;
}

function RectEditor({ label, rect, color, disabled, preview, onChange }: RectEditorProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: RectDragMode;
    startX: number;
    startY: number;
    origin: NormalizedRect;
  } | null>(null);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragRef.current;
      const box = boxRef.current;
      if (!drag || !box) return;

      const bounds = box.getBoundingClientRect();
      const point = pointerToNormalized(event.clientX, event.clientY, bounds);
      const dx = point.x - drag.startX;
      const dy = point.y - drag.startY;
      const origin = drag.origin;

      if (drag.mode === "move") {
        onChange(
          normalizeNormalizedRect({
            x: origin.x + dx,
            y: origin.y + dy,
            w: origin.w,
            h: origin.h,
          }),
        );
        return;
      }

      onChange(resizeRectFromCorner(origin, dx, dy, drag.mode === "resize-nw" ? "nw" : "se"));
    },
    [onChange],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
  }, [onPointerMove]);

  const startDrag = useCallback(
    (event: React.PointerEvent, mode: RectDragMode) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      const box = boxRef.current;
      if (!box) return;
      const bounds = box.getBoundingClientRect();
      const point = pointerToNormalized(event.clientX, event.clientY, bounds);
      dragRef.current = {
        mode,
        startX: point.x,
        startY: point.y,
        origin: rect,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
    },
    [disabled, endDrag, onPointerMove, rect],
  );

  const showHandles = !disabled;

  return (
    <Stack
      spacing={0.5}
      sx={{ flex: "1 1 0", minWidth: EDITOR_COLUMN_WIDTH, maxWidth: EDITOR_COLUMN_WIDTH }}
    >
      <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary" }}>
        {label}
      </Typography>
      <Box
        ref={boxRef}
        sx={{
          position: "relative",
          width: PREVIEW_WIDTH,
          height: PREVIEW_HEIGHT,
          border: 1,
          borderColor: "divider",
          borderRadius: 0.5,
          overflow: "hidden",
          touchAction: "none",
          bgcolor: "#000",
        }}
      >
        <FramePreviewStage preview={preview} />
        {showHandles && (
          <>
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                bgcolor: "rgba(0, 0, 0, 0.55)",
                clipPath: cropDimClipPath(rect),
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
            <Box
              onPointerDown={(event) => startDrag(event, "move")}
              sx={{
                position: "absolute",
                left: `${rect.x * 100}%`,
                top: `${rect.y * 100}%`,
                width: `${rect.w * 100}%`,
                height: `${rect.h * 100}%`,
                border: `2px solid ${color}`,
                cursor: "move",
                boxSizing: "border-box",
                zIndex: 2,
                background: "transparent",
              }}
            >
              <Box
                onPointerDown={(event) => startDrag(event, "resize-nw")}
                sx={{
                  position: "absolute",
                  left: -5,
                  top: -5,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: color,
                  border: "2px solid #000",
                  cursor: "nesw-resize",
                }}
              />
              <Box
                onPointerDown={(event) => startDrag(event, "resize-se")}
                sx={{
                  position: "absolute",
                  right: -5,
                  bottom: -5,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: color,
                  border: "2px solid #000",
                  cursor: "nwse-resize",
                }}
              />
            </Box>
          </>
        )}
      </Box>
      <RectValueFields rect={rect} disabled={disabled} onChange={onChange} />
    </Stack>
  );
}

interface QuadEditorProps {
  label: string;
  quad: NormalizedQuad;
  color: string;
  disabled: boolean;
  preview: VideoOutputFramePreviewSource;
  previewFrame: VideoOutputFrame;
  lockSize?: boolean;
  onChange: (quad: NormalizedQuad) => void;
}

function QuadEditor({
  label,
  quad,
  color,
  disabled,
  preview,
  previewFrame,
  lockSize,
  onChange,
}: QuadEditorProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: QuadDragMode;
    startX: number;
    startY: number;
    origin: NormalizedQuad;
  } | null>(null);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragRef.current;
      const box = boxRef.current;
      if (!drag || !box) return;

      const bounds = box.getBoundingClientRect();
      const point = pointerToNormalized(event.clientX, event.clientY, bounds);
      const dx = point.x - drag.startX;
      const dy = point.y - drag.startY;

      if (drag.mode === "move") {
        onChange(translateNormalizedQuad(drag.origin, dx, dy));
        return;
      }

      onChange(
        patchNormalizedQuadCorner(drag.origin, drag.mode, {
          x: drag.origin[drag.mode].x + dx,
          y: drag.origin[drag.mode].y + dy,
        }),
      );
    },
    [onChange],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
  }, [onPointerMove]);

  const startDrag = useCallback(
    (event: React.PointerEvent, mode: QuadDragMode) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      const box = boxRef.current;
      if (!box) return;
      const bounds = box.getBoundingClientRect();
      const point = pointerToNormalized(event.clientX, event.clientY, bounds);
      dragRef.current = {
        mode,
        startX: point.x,
        startY: point.y,
        origin: quad,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
    },
    [disabled, endDrag, onPointerMove, quad],
  );

  const showHandles = !disabled;

  return (
    <Stack
      spacing={0.5}
      sx={{ flex: "1 1 0", minWidth: EDITOR_COLUMN_WIDTH, maxWidth: EDITOR_COLUMN_WIDTH }}
    >
      <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary" }}>
        {label}
      </Typography>
      <Box
        ref={boxRef}
        sx={{
          position: "relative",
          width: PREVIEW_WIDTH,
          height: PREVIEW_HEIGHT,
          touchAction: "none",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            border: 1,
            borderColor: "divider",
            borderRadius: 0.5,
            overflow: "hidden",
            bgcolor: "#000",
          }}
        >
          <FrameWarpPreviewStage preview={preview} outputFrame={previewFrame} />
        </Box>
        {showHandles && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            >
              <polygon
                points={quadPolygonPoints(quad)}
                fill="none"
                stroke={color}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                touchAction: "none",
              }}
            >
              <polygon
                points={quadPolygonPoints(quad)}
                fill="rgba(0,0,0,0.001)"
                stroke="transparent"
                style={{ cursor: "move", pointerEvents: "auto" }}
                onPointerDown={(event) => startDrag(event, "move")}
              />
            </svg>
            {QUAD_CORNERS.map((corner) => (
              <Box
                key={corner}
                onPointerDown={(event) => startDrag(event, corner)}
                sx={{
                  position: "absolute",
                  left: `calc(${quad[corner].x * 100}% - 6px)`,
                  top: `calc(${quad[corner].y * 100}% - 6px)`,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: color,
                  border: "2px solid #000",
                  cursor: "grab",
                  pointerEvents: "auto",
                  touchAction: "none",
                }}
              />
            ))}
          </Box>
        )}
      </Box>
      <QuadValueFields quad={quad} disabled={disabled} lockSize={lockSize} onChange={onChange} />
    </Stack>
  );
}

interface VideoOutputFramePanelProps {
  preview: VideoOutputFramePreviewSource;
  frame?: VideoOutputFrame;
  canEdit: boolean;
  onChange: (frame: VideoOutputFrame) => void;
}

export function VideoOutputFramePanel({
  preview,
  frame,
  canEdit,
  onChange,
}: VideoOutputFramePanelProps) {
  const { t } = useTranslation();
  const normalized = normalizeVideoOutputFrame(frame);
  const [linkDestSize, setLinkDestSize] = useState(true);

  const patchQuad = useCallback(
    (field: "crop" | "dest", quad: NormalizedQuad) => {
      const next = normalizeVideoOutputFrame({ ...normalized, [field]: quad });
      if (field === "crop" && linkDestSize) {
        onChange(applyLinkedDestQuadSize(next, true));
        return;
      }
      onChange(next);
    },
    [linkDestSize, normalized, onChange],
  );

  const patchCropRect = useCallback(
    (rect: NormalizedRect) => {
      const next = normalizeVideoOutputFrame({
        ...normalized,
        crop: rectToQuad(rect),
      });
      onChange(linkDestSize ? applyLinkedDestQuadSize(next, true) : next);
    },
    [linkDestSize, normalized, onChange],
  );

  return (
    <Stack
      spacing={1}
      sx={{
        width: FRAME_PANEL_WIDTH,
        minWidth: FRAME_PANEL_WIDTH,
        flexShrink: 0,
        px: 1,
        py: 0.75,
        borderRight: 1,
        borderColor: "divider",
      }}
    >
      <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary" }}>
        {t("videoOutput.outputFrame")}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ minWidth: 0, alignItems: "flex-start" }}>
        <RectEditor
          label={t("videoOutput.frameCrop")}
          rect={quadToBoundingRect(normalized.crop)}
          color="#42a5f5"
          disabled={!canEdit}
          preview={preview}
          onChange={patchCropRect}
        />
        <QuadEditor
          label={t("videoOutput.framePlacement")}
          quad={normalized.dest}
          color="#66bb6a"
          disabled={!canEdit}
          preview={preview}
          previewFrame={normalized}
          lockSize={linkDestSize}
          onChange={(dest) => patchQuad("dest", dest)}
        />
      </Stack>
      {canEdit && (
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={linkDestSize}
              onChange={(_, checked) => {
                setLinkDestSize(checked);
                if (checked) {
                  onChange(applyLinkedDestQuadSize(normalized, true));
                }
              }}
              sx={{ py: 0 }}
            />
          }
          label={t("videoOutput.frameLinkSize")}
          sx={{
            m: 0,
            alignItems: "flex-start",
            "& .MuiFormControlLabel-label": { fontSize: 10, lineHeight: 1.3 },
          }}
        />
      )}
      {canEdit && !isIdentityVideoOutputFrame(normalized) && (
        <Button
          size="small"
          variant="text"
          sx={{ fontSize: 10, py: 0, alignSelf: "flex-start" }}
          onClick={() => onChange(defaultVideoOutputFrame())}
        >
          {t("videoOutput.frameReset")}
        </Button>
      )}
    </Stack>
  );
}

export function isOutputFrameActive(frame: VideoOutputFrame | undefined): boolean {
  return !isIdentityVideoOutputFrame(frame);
}
