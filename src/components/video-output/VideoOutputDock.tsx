import CloseIcon from "@mui/icons-material/Close";
import OndemandVideoOutlinedIcon from "@mui/icons-material/OndemandVideoOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_VIDEO_OUTPUT_DOCK_HEIGHT,
  MIN_VIDEO_OUTPUT_DOCK_HEIGHT,
} from "../../lib/video-output-layout";
import { openOutputWindow, openVideoBusOutputWindow } from "../../platform/output-window";
import { useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import type { VideoBus } from "../../types/video-bus";

const DOCK_RESIZE_HANDLE_HEIGHT = 6;
const STRIP_WIDTH = 132;

function MasterOutputStrip() {
  const { t } = useTranslation();
  const showMode = useUiStore((s) => s.showMode);
  const canEdit = !showMode;
  const masterVideoOutputName = useProjectStore((s) => s.masterVideoOutputName);
  const updateMasterVideoOutputName = useProjectStore((s) => s.updateMasterVideoOutputName);
  const [openError, setOpenError] = useState<string | null>(null);

  const handleOpen = useCallback(async () => {
    setOpenError(null);
    try {
      await openOutputWindow({ busName: masterVideoOutputName });
    } catch {
      setOpenError(t("output.openFailed"));
    }
  }, [masterVideoOutputName, t]);

  return (
    <Box
      sx={{
        flexShrink: 0,
        height: "100%",
        width: STRIP_WIDTH,
        minWidth: STRIP_WIDTH,
        display: "flex",
        flexDirection: "column",
        mr: 1,
        border: 1,
        borderColor: "primary.main",
        borderRadius: 1,
        bgcolor: "background.default",
      }}
    >
      <Stack
        sx={{
          px: 0.75,
          py: 0.5,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          minWidth: 0,
        }}
      >
        <TextField
          size="small"
          value={masterVideoOutputName}
          disabled={!canEdit}
          onChange={(event) => updateMasterVideoOutputName(event.target.value)}
          variant="standard"
          sx={{
            width: "100%",
            "& .MuiInput-root": { fontSize: 12, fontWeight: 600 },
            "& .MuiInput-input": { py: 0.25 },
          }}
        />
      </Stack>

      <Stack
        spacing={1}
        sx={{
          flex: 1,
          minHeight: 0,
          px: 1,
          py: 1,
          justifyContent: "flex-end",
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1.4 }}>
          {t("videoOutput.masterStripHint")}
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
          onClick={handleOpen}
          sx={{ minWidth: 0, px: 0.75, fontSize: 11 }}
        >
          {t("videoOutput.openWindow")}
        </Button>
        {openError && (
          <Typography variant="caption" color="error" sx={{ fontSize: 10 }}>
            {openError}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

interface OutputStripProps {
  bus: VideoBus;
  canEdit: boolean;
  onUpdate: (patch: Partial<Omit<VideoBus, "id">>) => void;
  onRemove: () => void;
}

function OutputStrip({ bus, canEdit, onUpdate, onRemove }: OutputStripProps) {
  const { t } = useTranslation();
  const [openError, setOpenError] = useState<string | null>(null);

  const handleOpen = useCallback(async () => {
    setOpenError(null);
    try {
      await openVideoBusOutputWindow(bus.id, bus.name);
    } catch {
      setOpenError(t("output.openFailed"));
    }
  }, [bus.id, bus.name, t]);

  return (
    <Box
      sx={{
        flexShrink: 0,
        height: "100%",
        width: STRIP_WIDTH,
        minWidth: STRIP_WIDTH,
        display: "flex",
        flexDirection: "column",
        mr: 1,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.default",
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          gap: 0.25,
          px: 0.75,
          py: 0.5,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          minWidth: 0,
        }}
      >
        <TextField
          size="small"
          value={bus.name}
          disabled={!canEdit}
          onChange={(event) => onUpdate({ name: event.target.value })}
          variant="standard"
          sx={{
            flex: 1,
            minWidth: 0,
            "& .MuiInput-root": { fontSize: 12, fontWeight: 600 },
            "& .MuiInput-input": { py: 0.25 },
          }}
        />
        {canEdit && (
          <IconButton
            size="small"
            title={t("videoOutput.removeBus")}
            aria-label={t("videoOutput.removeBus")}
            onClick={onRemove}
            sx={{ flexShrink: 0, p: 0.5 }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Stack>

      <Stack
        spacing={1}
        sx={{
          flex: 1,
          minHeight: 0,
          px: 1,
          py: 1,
          alignItems: "stretch",
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", color: "text.secondary" }}
        >
          {t("videoOutput.opacity")}
        </Typography>
        <Slider
          orientation="vertical"
          min={0}
          max={1}
          step={0.01}
          value={bus.opacity}
          disabled={!canEdit}
          onChange={(_, value) => onUpdate({ opacity: value as number })}
          sx={{
            flex: 1,
            mx: "auto",
            color: "primary.main",
            "& .MuiSlider-rail": { width: 3, opacity: 0.35 },
            "& .MuiSlider-track": { width: 3, border: "none" },
            "& .MuiSlider-thumb": { width: 12, height: 12 },
          }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
          onClick={handleOpen}
          sx={{ minWidth: 0, px: 0.75, fontSize: 11 }}
        >
          {t("videoOutput.openWindow")}
        </Button>
        {openError && (
          <Typography variant="caption" color="error" sx={{ fontSize: 10 }}>
            {openError}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

interface DockResizeHandleProps {
  height: number;
  onResize: (height: number) => void;
}

function DockResizeHandle({ height, onResize }: DockResizeHandleProps) {
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

export function VideoOutputDock() {
  const { t } = useTranslation();
  const showMode = useUiStore((s) => s.showMode);
  const setVideoOutputOpen = useUiStore((s) => s.setVideoOutputOpen);
  const videoOutputHeight = useUiStore((s) => s.videoOutputHeight);
  const setVideoOutputHeight = useUiStore((s) => s.setVideoOutputHeight);
  const canEdit = !showMode;
  const videoBuses = useProjectStore((s) => s.videoBuses);
  const addVideoBus = useProjectStore((s) => s.addVideoBus);
  const updateVideoBus = useProjectStore((s) => s.updateVideoBus);
  const removeVideoBus = useProjectStore((s) => s.removeVideoBus);

  const handleAddBus = useCallback(() => {
    addVideoBus();
  }, [addVideoBus]);

  const handleResize = useCallback(
    (nextHeight: number) => {
      setVideoOutputHeight(nextHeight);
    },
    [setVideoOutputHeight],
  );

  return (
    <Box
      sx={{
        height: videoOutputHeight,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        minWidth: 0,
      }}
    >
      <DockResizeHandle height={videoOutputHeight} onResize={handleResize} />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderBottom: 1,
            borderColor: "divider",
            flexShrink: 0,
          }}
        >
          <OndemandVideoOutlinedIcon fontSize="small" color="primary" aria-hidden />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ m: 0 }}>
              {t("videoOutput.title")}
            </Typography>
            {!showMode && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {t("videoOutput.hintShort")}
              </Typography>
            )}
            {showMode && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {t("videoOutput.showModeHint")}
              </Typography>
            )}
          </Box>
          <IconButton
            size="small"
            title={t("videoOutput.close")}
            aria-label={t("videoOutput.close")}
            onClick={() => setVideoOutputOpen(false)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, display: "flex", minWidth: 0 }}>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "stretch",
              justifyContent: "flex-start",
              overflow: "auto",
              px: 1,
              py: 1,
            }}
          >
            <MasterOutputStrip />
            {videoBuses.map((bus) => (
              <OutputStrip
                key={bus.id}
                bus={bus}
                canEdit={canEdit}
                onUpdate={(patch) => updateVideoBus(bus.id, patch)}
                onRemove={() => removeVideoBus(bus.id)}
              />
            ))}
          </Box>

          {canEdit && (
            <Box
              sx={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                px: 1,
                borderLeft: 1,
                borderColor: "divider",
              }}
            >
              <Button size="small" variant="text" onClick={handleAddBus}>
                {t("videoOutput.addBus")}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export const videoOutputDockHeight = DEFAULT_VIDEO_OUTPUT_DOCK_HEIGHT;
