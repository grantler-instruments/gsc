import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useRef } from "react";
import { normalizeNormalizedRect } from "../../lib/video-output-frame";
import type { NormalizedRect } from "../../types/video-output-frame";
import { RectValueFields } from "./FramePanelValueFields";
import { FramePreviewStage, type VideoOutputFramePreviewSource } from "./FramePreviewStage";
import { EDITOR_COLUMN_WIDTH, PREVIEW_HEIGHT, PREVIEW_WIDTH } from "./frame-panel-layout";
import {
  cropDimClipPath,
  pointerToNormalized,
  type RectDragMode,
  resizeRectFromCorner,
} from "./frame-panel-utils";

interface RectEditorProps {
  label: string;
  rect: NormalizedRect;
  color: string;
  disabled: boolean;
  preview: VideoOutputFramePreviewSource;
  onChange: (rect: NormalizedRect) => void;
}

export function RectEditor({ label, rect, color, disabled, preview, onChange }: RectEditorProps) {
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
