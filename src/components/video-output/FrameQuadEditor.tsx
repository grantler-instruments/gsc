import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useRef } from "react";
import { patchNormalizedQuadCorner, translateNormalizedQuad } from "../../lib/video-output-frame";
import type { NormalizedQuad, QuadCorner, VideoOutputFrame } from "../../types/video-output-frame";
import { QuadValueFields } from "./FramePanelValueFields";
import { FrameWarpPreviewStage, type VideoOutputFramePreviewSource } from "./FramePreviewStage";
import {
  EDITOR_COLUMN_WIDTH,
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
  QUAD_CORNERS,
} from "./frame-panel-layout";
import { pointerToNormalized, quadPolygonPoints } from "./frame-panel-utils";

type QuadDragMode = "move" | QuadCorner;

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

export function QuadEditor({
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
