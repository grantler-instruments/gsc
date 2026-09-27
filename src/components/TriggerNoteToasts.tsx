import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPrimarySelectedCueId } from "../lib/cue-selection";
import { useActiveCueList } from "../stores/project";
import { useUiStore } from "../stores/ui";

/** Movable preview of the selected cue's trigger note for the operator. */
export function TriggerNoteToasts() {
  const { t } = useTranslation();
  const activeList = useActiveCueList();
  const selectedCueId = getPrimarySelectedCueId(activeList.selectedCueIds);
  const cue = selectedCueId ? activeList.cues.find((c) => c.id === selectedCueId) : undefined;
  const message = cue?.triggerNote?.trim();
  const [dismissedCueId, setDismissedCueId] = useState<string | null>(null);
  const visible = Boolean(cue && message && dismissedCueId !== selectedCueId);
  const savedPosition = useUiStore((s) => s.triggerNotePosition);
  const savePosition = useUiStore((s) => s.setTriggerNotePosition);
  const [position, setPosition] = useState(savedPosition);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);

  const clampPosition = (x: number, y: number) => {
    const rect = cardRef.current?.getBoundingClientRect();
    return {
      x: Math.max(
        16,
        Math.min(Number.isFinite(x) ? x : 16, window.innerWidth - (rect?.width ?? 360) - 16),
      ),
      y: Math.max(
        16,
        Math.min(Number.isFinite(y) ? y : 16, window.innerHeight - (rect?.height ?? 0) - 16),
      ),
    };
  };

  useLayoutEffect(() => {
    if (!visible) return;
    const card = cardRef.current;
    if (!card) return;
    const keepInWindow = () => {
      const rect = card.getBoundingClientRect();
      setPosition((previous) => {
        if (!previous) return previous;
        const x = Math.max(16, Math.min(previous.x, window.innerWidth - rect.width - 16));
        const y = Math.max(16, Math.min(previous.y, window.innerHeight - rect.height - 16));
        return x === previous.x && y === previous.y ? previous : { x, y };
      });
    };
    keepInWindow();
    const observer = new ResizeObserver(keepInWindow);
    observer.observe(card);
    window.addEventListener("resize", keepInWindow);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", keepInWindow);
    };
  }, [visible]);

  useEffect(() => {
    setDismissedCueId((previous) => (previous === selectedCueId ? previous : null));
  }, [selectedCueId]);

  if (!cue || !message || dismissedCueId === selectedCueId) return null;

  return (
    <Box
      ref={cardRef}
      aria-live="polite"
      sx={{
        position: "fixed",
        top: position?.y ?? 16,
        left: position?.x,
        right: position ? undefined : 16,
        zIndex: (theme) => theme.zIndex.snackbar + 1,
        maxWidth: 360,
        width: "min(360px, calc(100vw - 32px))",
        maxHeight: "calc(100dvh - 32px)",
        overflowY: "auto",
      }}
    >
      <Alert
        severity="info"
        variant="filled"
        sx={{
          width: "100%",
          "& .MuiAlert-message": { minWidth: 0, flex: 1 },
          overflowWrap: "anywhere",
        }}
        onClose={() => selectedCueId && setDismissedCueId(selectedCueId)}
        slotProps={{
          closeButton: {
            "aria-label": t("common.action.close"),
          },
        }}
      >
        <Box
          component="button"
          type="button"
          aria-label={t("inspector.moveTriggerNote")}
          title={t("inspector.moveTriggerNote")}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            const rect = cardRef.current?.getBoundingClientRect();
            if (!rect) return;
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
              pointerId: event.pointerId,
              offsetX: event.clientX - rect.left,
              offsetY: event.clientY - rect.top,
            };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            setPosition(clampPosition(event.clientX - drag.offsetX, event.clientY - drag.offsetY));
          }}
          onPointerUp={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            const next = clampPosition(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
            setPosition(next);
            savePosition(next);
            dragRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onLostPointerCapture={() => {
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
          onKeyDown={(event) => {
            const directions: Record<string, [number, number]> = {
              ArrowLeft: [-1, 0],
              ArrowRight: [1, 0],
              ArrowUp: [0, -1],
              ArrowDown: [0, 1],
            };
            const direction = directions[event.key];
            if (!direction) return;
            event.preventDefault();
            event.stopPropagation();
            const rect = cardRef.current?.getBoundingClientRect();
            if (!rect) return;
            const step = event.shiftKey ? 1 : 10;
            const next = clampPosition(
              rect.left + direction[0] * step,
              rect.top + direction[1] * step,
            );
            setPosition(next);
            savePosition(next);
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            width: "100%",
            border: 0,
            p: 0,
            bgcolor: "transparent",
            color: "inherit",
            font: "inherit",
            textAlign: "left",
            cursor: "grab",
            touchAction: "none",
            userSelect: "none",
            "&:active": { cursor: "grabbing" },
            "&:focus-visible": { outline: "2px solid currentColor", outlineOffset: 2 },
            m: 0,
            mb: 0.5,
            opacity: 0.85,
            fontWeight: 600,
            letterSpacing: "0.02em",
            lineHeight: 1.3,
          }}
        >
          <DragIndicatorIcon sx={{ fontSize: 16, flexShrink: 0 }} />
          <Typography component="span" variant="caption" sx={{ opacity: 0.85, fontWeight: 600 }}>
            {cue.name}
          </Typography>
        </Box>
        <Typography
          component="p"
          variant="body1"
          sx={{
            m: 0,
            fontWeight: 500,
            lineHeight: 1.45,
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </Typography>
      </Alert>
    </Box>
  );
}
