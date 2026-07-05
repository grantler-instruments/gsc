import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import CropFreeIcon from "@mui/icons-material/CropFree";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { openOutputWindow, openVideoBusOutputWindow } from "../../platform/output-window";
import { useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import type { OutputPreviewDestination } from "../../types/output";
import type { VideoBus } from "../../types/video-bus";
import type { VideoEffectParams, VideoEffectType } from "../../types/video-effect";
import { premixerContentWidth, VideoBusPremixer } from "./VideoBusPremixer";
import {
  FRAME_PANEL_WIDTH,
  isOutputFrameActive,
  VideoOutputFramePanel,
  type VideoOutputFramePreviewSource,
} from "./VideoOutputFramePanel";

const STRIP_WIDTH = 132;

function outputStripWidth(
  premixerOpen: boolean,
  premixerWidth: number,
  frameOpen: boolean,
  faderWidth: number,
): number {
  const sideWidth = (premixerOpen ? premixerWidth : 0) + (frameOpen ? FRAME_PANEL_WIDTH : 0);
  return sideWidth > 0 ? sideWidth + faderWidth + 8 : faderWidth + 16;
}

function useFramePreviewSource(
  destination: OutputPreviewDestination | undefined,
): VideoOutputFramePreviewSource {
  return useMemo(
    () => ({
      layers: destination?.layers ?? [],
      busEffects: destination?.busEffects,
      busOpacity: destination?.busOpacity,
    }),
    [destination?.layers, destination?.busEffects, destination?.busOpacity],
  );
}

export function MasterOutputStrip({ preview }: { preview: OutputPreviewDestination | undefined }) {
  const previewSourceValue = useFramePreviewSource(preview);
  const { t } = useTranslation();
  const showMode = useUiStore((s) => s.showMode);
  const canEdit = !showMode;
  const masterVideoOutputName = useProjectStore((s) => s.masterVideoOutputName);
  const masterVideoOutputOpacity = useProjectStore((s) => s.masterVideoOutputOpacity);
  const masterVideoOutputEffects = useProjectStore((s) => s.masterVideoOutputEffects);
  const masterVideoOutputFrame = useProjectStore((s) => s.masterVideoOutputFrame);
  const updateMasterVideoOutputName = useProjectStore((s) => s.updateMasterVideoOutputName);
  const updateMasterVideoOutputOpacity = useProjectStore((s) => s.updateMasterVideoOutputOpacity);
  const updateMasterVideoOutputFrame = useProjectStore((s) => s.updateMasterVideoOutputFrame);
  const addMasterVideoOutputEffect = useProjectStore((s) => s.addMasterVideoOutputEffect);
  const updateMasterVideoOutputEffect = useProjectStore((s) => s.updateMasterVideoOutputEffect);
  const removeMasterVideoOutputEffect = useProjectStore((s) => s.removeMasterVideoOutputEffect);
  const reorderMasterVideoOutputEffectRelative = useProjectStore(
    (s) => s.reorderMasterVideoOutputEffectRelative,
  );
  const [openError, setOpenError] = useState<string | null>(null);
  const [premixerOpen, setPremixerOpen] = useState((masterVideoOutputEffects?.length ?? 0) > 0);
  const [frameOpen, setFrameOpen] = useState(isOutputFrameActive(masterVideoOutputFrame));
  const effectsHost = { effects: masterVideoOutputEffects };
  const premixerWidth = premixerContentWidth(effectsHost);
  const faderWidth = STRIP_WIDTH;
  const stripWidth = outputStripWidth(premixerOpen, premixerWidth, frameOpen, faderWidth);

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
        width: stripWidth,
        minWidth: stripWidth,
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
        <IconButton
          size="small"
          title={frameOpen ? t("videoOutput.collapseFrame") : t("videoOutput.expandFrame")}
          aria-expanded={frameOpen}
          onClick={() => setFrameOpen((open) => !open)}
          sx={{ flexShrink: 0, p: 0.5 }}
        >
          <CropFreeIcon sx={{ fontSize: 16, color: frameOpen ? "primary.main" : "inherit" }} />
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

        {frameOpen && (
          <VideoOutputFramePanel
            preview={previewSourceValue}
            frame={masterVideoOutputFrame}
            canEdit={canEdit}
            onChange={updateMasterVideoOutputFrame}
          />
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
  preview: OutputPreviewDestination | undefined;
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

export function OutputStrip({
  bus,
  preview,
  canEdit,
  onUpdate,
  onRemove,
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect,
  onReorderEffect,
}: OutputStripProps) {
  const { t } = useTranslation();
  const previewSourceValue = useFramePreviewSource(preview);
  const [openError, setOpenError] = useState<string | null>(null);
  const [premixerOpen, setPremixerOpen] = useState((bus.effects?.length ?? 0) > 0);
  const [frameOpen, setFrameOpen] = useState(isOutputFrameActive(bus.outputFrame));
  const premixerWidth = premixerContentWidth(bus);
  const faderWidth = STRIP_WIDTH;
  const stripWidth = outputStripWidth(premixerOpen, premixerWidth, frameOpen, faderWidth);

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
        width: stripWidth,
        minWidth: stripWidth,
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
        <IconButton
          size="small"
          title={frameOpen ? t("videoOutput.collapseFrame") : t("videoOutput.expandFrame")}
          aria-expanded={frameOpen}
          onClick={() => setFrameOpen((open) => !open)}
          sx={{ flexShrink: 0, p: 0.5 }}
        >
          <CropFreeIcon sx={{ fontSize: 16, color: frameOpen ? "primary.main" : "inherit" }} />
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

        {frameOpen && (
          <VideoOutputFramePanel
            preview={previewSourceValue}
            frame={bus.outputFrame}
            canEdit={canEdit}
            onChange={(outputFrame) => onUpdate({ outputFrame })}
          />
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
