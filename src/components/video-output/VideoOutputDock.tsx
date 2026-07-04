import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
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
import type { VideoEffectParams, VideoEffectType } from "../../types/video-effect";
import { premixerContentWidth, VideoBusPremixer } from "./VideoBusPremixer";

const DOCK_RESIZE_HANDLE_HEIGHT = 6;
const STRIP_WIDTH = 132;

function MasterOutputStrip() {
  const { t } = useTranslation();
  const showMode = useUiStore((s) => s.showMode);
  const canEdit = !showMode;
  const masterVideoOutputName = useProjectStore((s) => s.masterVideoOutputName);
  const masterVideoOutputOpacity = useProjectStore((s) => s.masterVideoOutputOpacity);
  const masterVideoOutputEffects = useProjectStore((s) => s.masterVideoOutputEffects);
  const updateMasterVideoOutputName = useProjectStore((s) => s.updateMasterVideoOutputName);
  const updateMasterVideoOutputOpacity = useProjectStore((s) => s.updateMasterVideoOutputOpacity);
  const addMasterVideoOutputEffect = useProjectStore((s) => s.addMasterVideoOutputEffect);
  const updateMasterVideoOutputEffect = useProjectStore((s) => s.updateMasterVideoOutputEffect);
  const removeMasterVideoOutputEffect = useProjectStore((s) => s.removeMasterVideoOutputEffect);
  const reorderMasterVideoOutputEffectRelative = useProjectStore(
    (s) => s.reorderMasterVideoOutputEffectRelative,
  );
  const [openError, setOpenError] = useState<string | null>(null);
  const [premixerOpen, setPremixerOpen] = useState((masterVideoOutputEffects?.length ?? 0) > 0);
  const effectsHost = { effects: masterVideoOutputEffects };
  const premixerWidth = premixerContentWidth(effectsHost);
  const faderWidth = STRIP_WIDTH;

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
        display: "flex",
        flexDirection: "column",
        mr: 1,
        width: premixerOpen ? premixerWidth + faderWidth + 8 : faderWidth + 16,
        minWidth: premixerOpen ? premixerWidth + faderWidth + 8 : faderWidth + 16,
        border: 1,
        borderColor: "primary.main",
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
        <IconButton
          size="small"
          title={premixerOpen ? t("videoOutput.collapsePremixer") : t("videoOutput.expandPremixer")}
          aria-expanded={premixerOpen}
          onClick={() => setPremixerOpen((open) => !open)}
          sx={{ flexShrink: 0, p: 0.5 }}
        >
          {premixerOpen ? (
            <ChevronLeftIcon sx={{ fontSize: 16 }} />
          ) : (
            <ChevronRightIcon sx={{ fontSize: 16 }} />
          )}
        </IconButton>
        <TextField
          size="small"
          value={masterVideoOutputName}
          disabled={!canEdit}
          onChange={(event) => updateMasterVideoOutputName(event.target.value)}
          variant="standard"
          sx={{
            flex: 1,
            minWidth: 0,
            "& .MuiInput-root": { fontSize: 12, fontWeight: 600 },
            "& .MuiInput-input": { py: 0.25 },
          }}
        />
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "row",
          overflow: "auto",
        }}
      >
        {premixerOpen && (
          <Box
            sx={{
              width: premixerWidth,
              minWidth: premixerWidth,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              borderRight: 1,
              borderColor: "divider",
              overflow: "auto",
            }}
          >
            <VideoBusPremixer
              host={effectsHost}
              canEdit={canEdit}
              onAddEffect={(type) => {
                addMasterVideoOutputEffect(type);
                setPremixerOpen(true);
              }}
              onUpdateEffect={(effectId, patch) => updateMasterVideoOutputEffect(effectId, patch)}
              onRemoveEffect={removeMasterVideoOutputEffect}
              onReorderEffect={reorderMasterVideoOutputEffectRelative}
            />
          </Box>
        )}

        <Stack
          spacing={1}
          sx={{
            width: faderWidth,
            minWidth: faderWidth,
            flexShrink: 0,
            minHeight: 0,
            px: 1,
            py: 1,
            alignItems: "stretch",
            justifyContent: "flex-end",
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
            value={masterVideoOutputOpacity}
            disabled={!canEdit}
            onChange={(_, value) => updateMasterVideoOutputOpacity(value as number)}
            sx={{
              flex: 1,
              mx: "auto",
              color: "primary.main",
              "& .MuiSlider-rail": { width: 3, opacity: 0.35 },
              "& .MuiSlider-track": { width: 3, border: "none" },
              "& .MuiSlider-thumb": { width: 12, height: 12 },
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: 10, lineHeight: 1.4 }}
          >
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
    </Box>
  );
}

interface OutputStripProps {
  bus: VideoBus;
  canEdit: boolean;
  onUpdate: (patch: Partial<Omit<VideoBus, "id">>) => void;
  onRemove: () => void;
  onAddEffect: (type: VideoEffectType) => void;
  onUpdateEffect: (
    effectId: string,
    patch: {
      params?: Partial<VideoEffectParams>;
      enabled?: boolean;
    },
  ) => void;
  onRemoveEffect: (effectId: string) => void;
  onReorderEffect: (draggedId: string, targetId: string, place: "before" | "after") => void;
}

function OutputStrip({
  bus,
  canEdit,
  onUpdate,
  onRemove,
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect,
  onReorderEffect,
}: OutputStripProps) {
  const { t } = useTranslation();
  const [openError, setOpenError] = useState<string | null>(null);
  const [premixerOpen, setPremixerOpen] = useState((bus.effects?.length ?? 0) > 0);
  const premixerWidth = premixerContentWidth(bus);
  const faderWidth = STRIP_WIDTH;

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
        display: "flex",
        flexDirection: "column",
        mr: 1,
        width: premixerOpen ? premixerWidth + faderWidth + 8 : faderWidth + 16,
        minWidth: premixerOpen ? premixerWidth + faderWidth + 8 : faderWidth + 16,
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
        <IconButton
          size="small"
          title={premixerOpen ? t("videoOutput.collapsePremixer") : t("videoOutput.expandPremixer")}
          aria-expanded={premixerOpen}
          onClick={() => setPremixerOpen((open) => !open)}
          sx={{ flexShrink: 0, p: 0.5 }}
        >
          {premixerOpen ? (
            <ChevronLeftIcon sx={{ fontSize: 16 }} />
          ) : (
            <ChevronRightIcon sx={{ fontSize: 16 }} />
          )}
        </IconButton>
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

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "row",
          overflow: "auto",
        }}
      >
        {premixerOpen && (
          <Box
            sx={{
              width: premixerWidth,
              minWidth: premixerWidth,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              borderRight: 1,
              borderColor: "divider",
              overflow: "auto",
            }}
          >
            <VideoBusPremixer
              host={bus}
              canEdit={canEdit}
              onAddEffect={(type) => {
                onAddEffect(type);
                setPremixerOpen(true);
              }}
              onUpdateEffect={onUpdateEffect}
              onRemoveEffect={onRemoveEffect}
              onReorderEffect={onReorderEffect}
            />
          </Box>
        )}

        <Stack
          spacing={1}
          sx={{
            width: faderWidth,
            minWidth: faderWidth,
            flexShrink: 0,
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
  const addVideoBusEffect = useProjectStore((s) => s.addVideoBusEffect);
  const updateVideoBusEffect = useProjectStore((s) => s.updateVideoBusEffect);
  const removeVideoBusEffect = useProjectStore((s) => s.removeVideoBusEffect);
  const reorderVideoBusEffectRelative = useProjectStore((s) => s.reorderVideoBusEffectRelative);

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
                onAddEffect={(type) => addVideoBusEffect(bus.id, type)}
                onUpdateEffect={(effectId, patch) => updateVideoBusEffect(bus.id, effectId, patch)}
                onRemoveEffect={(effectId) => removeVideoBusEffect(bus.id, effectId)}
                onReorderEffect={(draggedId, targetId, place) =>
                  reorderVideoBusEffectRelative(bus.id, draggedId, targetId, place)
                }
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
