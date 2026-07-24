import Box from "@mui/material/Box";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { MIN_VIDEO_OUTPUT_DOCK_HEIGHT } from "../../lib/video-output-layout";

const DOCK_RESIZE_HANDLE_HEIGHT = 6;

interface DockResizeHandleProps {
  height: number;
  onResize: (height: number) => void;
}

export function DockResizeHandle({ height, onResize }: DockResizeHandleProps) {
  const { t } = useTranslation();
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const endDrag = (target: EventTarget & Element, pointerId: number) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    target.releasePointerCapture(pointerId);
    document.body.style.userSelect = "";
  };

  return (
    <Box
      role="separator"
      aria-orientation="horizontal"
      aria-valuenow={height}
      aria-valuemin={MIN_VIDEO_OUTPUT_DOCK_HEIGHT}
      aria-label={t("videoOutput.resize")}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        document.body.style.userSelect = "none";
        dragRef.current = {
          startY: event.clientY,
          startHeight: height,
        };
      }}
      onPointerMove={(event) => {
        if (!dragRef.current) return;
        const deltaY = dragRef.current.startY - event.clientY;
        onResize(dragRef.current.startHeight + deltaY);
      }}
      onPointerUp={(event) => endDrag(event.currentTarget, event.pointerId)}
      onPointerCancel={(event) => endDrag(event.currentTarget, event.pointerId)}
      sx={{
        flexShrink: 0,
        height: DOCK_RESIZE_HANDLE_HEIGHT,
        cursor: "ns-resize",
        touchAction: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
        "&:hover, &:active": {
          bgcolor: "action.hover",
        },
        "&::before": {
          content: '""',
          width: 32,
          height: 3,
          borderRadius: 1,
          bgcolor: "text.disabled",
        },
      }}
    />
  );
}
