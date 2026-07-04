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
  defaultVideoOutputFrame,
  isIdentityVideoOutputFrame,
  normalizeNormalizedRect,
  normalizeVideoOutputFrame,
} from "../../lib/video-output-frame";
import { outputLayerTargetTime } from "../../lib/video-playback";
import { resolveEffectiveOpacity, useFadeStore } from "../../stores/fade";
import type { OutputLayer } from "../../types/output";
import type { VideoEffect } from "../../types/video-effect";
import type { NormalizedRect, VideoOutputFrame } from "../../types/video-output-frame";
import { visualStageEmptySx } from "../visualStageSx";

export const EDITOR_COLUMN_WIDTH = 220;
export const FRAME_PANEL_WIDTH = EDITOR_COLUMN_WIDTH * 2 + 24;

const PREVIEW_WIDTH = EDITOR_COLUMN_WIDTH;
const PREVIEW_HEIGHT = 115;
const MIN_DRAG_SIZE = 0.08;

type DragMode = "move" | "resize-se" | "resize-nw";
type RectField = keyof NormalizedRect;

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

function applyLinkedDestSize(frame: VideoOutputFrame, linkDestSize: boolean): VideoOutputFrame {
  if (!linkDestSize) return frame;
  return normalizeVideoOutputFrame({
    ...frame,
    dest: normalizeNormalizedRect({
      ...frame.dest,
      w: frame.crop.w,
      h: frame.crop.h,
    }),
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

export interface VideoOutputFramePreviewSource {
  layers: OutputLayer[];
  busEffects?: VideoEffect[];
  busOpacity?: number;
}

interface FramePreviewStageProps {
  preview: VideoOutputFramePreviewSource;
  outputFrame?: VideoOutputFrame;
}

function livePreviewLayers(preview: VideoOutputFramePreviewSource, frameMs: number): OutputLayer[] {
  const dimmer = preview.busOpacity ?? 1;
  return preview.layers.map((layer) => ({
    ...layer,
    opacity: resolveEffectiveOpacity(layer.cueId, layer.opacity, frameMs) * dimmer,
  }));
}

function cropDimClipPath(rect: NormalizedRect): string {
  const x1 = rect.x * 100;
  const y1 = rect.y * 100;
  const x2 = (rect.x + rect.w) * 100;
  const y2 = (rect.y + rect.h) * 100;
  return `polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${x1}% ${y1}%, ${x2}% ${y1}%, ${x2}% ${y2}%, ${x1}% ${y2}%, ${x1}% ${y1}%)`;
}

function FramePreviewLayer({ layer, zIndex }: { layer: OutputLayer; zIndex: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackUrl = useAssetObjectUrl(layer.assetPath);
  const objectUrl = layer.objectUrl || fallbackUrl || "";

  useEffect(() => {
    if (layer.type !== "video" || !objectUrl) return;
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = objectUrl;

    const startPlayback = () => {
      try {
        video.currentTime = outputLayerTargetTime(layer);
      } catch {
        /* metadata not ready */
      }
      void video.play().catch(() => {});
    };

    video.addEventListener("loadedmetadata", startPlayback);
    video.addEventListener("canplay", startPlayback);
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) startPlayback();

    return () => {
      video.removeEventListener("loadedmetadata", startPlayback);
      video.removeEventListener("canplay", startPlayback);
      video.removeAttribute("src");
      video.load();
    };
  }, [
    layer.assetPath,
    layer.cueId,
    layer.goAtMs,
    layer.inTime,
    layer.loopCount,
    layer.sliceSec,
    layer.type,
    objectUrl,
  ]);

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

/** Maps crop/dest frame in DOM space (matches the output-frame shader layout). */
function OutputFrameDomWrap({
  frame,
  children,
}: {
  frame: VideoOutputFrame;
  children: React.ReactNode;
}) {
  const normalized = normalizeVideoOutputFrame(frame);
  const { crop, dest } = normalized;

  return (
    <Box sx={{ position: "absolute", inset: 0, bgcolor: "#000" }}>
      <Box
        sx={{
          position: "absolute",
          left: `${dest.x * 100}%`,
          top: `${dest.y * 100}%`,
          width: `${dest.w * 100}%`,
          height: `${dest.h * 100}%`,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: `${(-crop.x / crop.w) * 100}%`,
            top: `${(-crop.y / crop.h) * 100}%`,
            width: `${(1 / crop.w) * 100}%`,
            height: `${(1 / crop.h) * 100}%`,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

function FramePreviewStage({ preview, outputFrame }: FramePreviewStageProps) {
  const { t } = useTranslation();
  const frameMs = useFadeStore((s) => s.frameMs);
  const layers = useMemo(
    () => livePreviewLayers(preview, frameMs),
    [preview.layers, preview.busOpacity, frameMs],
  );
  const mappedFrame = outputFrame ? normalizeVideoOutputFrame(outputFrame) : undefined;
  const showFrameMap = mappedFrame !== undefined && !isIdentityVideoOutputFrame(mappedFrame);

  return (
    <Box sx={{ position: "absolute", inset: 0, bgcolor: "#000", overflow: "hidden" }}>
      {preview.layers.length === 0 ? (
        <Typography component="span" sx={visualStageEmptySx}>
          {t("videoOutput.frameNoPreview")}
        </Typography>
      ) : showFrameMap ? (
        <OutputFrameDomWrap frame={mappedFrame}>
          <FramePreviewLayerStack layers={layers} />
        </OutputFrameDomWrap>
      ) : (
        <FramePreviewLayerStack layers={layers} />
      )}
    </Box>
  );
}

interface RectEditorProps {
  label: string;
  rect: NormalizedRect;
  color: string;
  disabled: boolean;
  preview: VideoOutputFramePreviewSource;
  previewFrame?: VideoOutputFrame;
  lockSize?: boolean;
  enableNwHandle?: boolean;
  onChange: (rect: NormalizedRect) => void;
}

function pointerToNormalized(
  clientX: number,
  clientY: number,
  bounds: DOMRect,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)),
    y: Math.max(0, Math.min(1, (clientY - bounds.top) / bounds.height)),
  };
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

function RectEditor({
  label,
  rect,
  color,
  disabled,
  preview,
  previewFrame,
  lockSize,
  enableNwHandle,
  onChange,
}: RectEditorProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: DragMode;
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
    (event: React.PointerEvent, mode: DragMode) => {
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
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
    },
    [disabled, endDrag, onPointerMove, rect],
  );

  const showHandles = !disabled && preview.layers.length > 0;

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
        <FramePreviewStage preview={preview} outputFrame={previewFrame} />
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
              {enableNwHandle && (
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
              )}
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
      <RectValueFields rect={rect} disabled={disabled} lockSize={lockSize} onChange={onChange} />
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

  const applyFrame = useCallback(
    (next: VideoOutputFrame) => {
      onChange(applyLinkedDestSize(next, linkDestSize));
    },
    [linkDestSize, onChange],
  );

  const patchRect = useCallback(
    (field: "crop" | "dest", rect: NormalizedRect) => {
      applyFrame(normalizeVideoOutputFrame({ ...normalized, [field]: rect }));
    },
    [applyFrame, normalized],
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
          rect={normalized.crop}
          color="#42a5f5"
          disabled={!canEdit}
          preview={preview}
          enableNwHandle
          onChange={(crop) => patchRect("crop", crop)}
        />
        <RectEditor
          label={t("videoOutput.framePlacement")}
          rect={normalized.dest}
          color="#66bb6a"
          disabled={!canEdit}
          preview={preview}
          previewFrame={normalized}
          lockSize={linkDestSize}
          onChange={(dest) => patchRect("dest", dest)}
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
                  applyFrame(normalized);
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
