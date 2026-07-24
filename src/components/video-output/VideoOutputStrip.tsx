import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import CropFreeIcon from "@mui/icons-material/CropFree";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { openOutputWindow } from "../../platform/output-window";
import { useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import type { OutputPreviewDestination } from "../../types/output";
import type { VideoBus } from "../../types/video-bus";
import type { VideoEffectParams, VideoEffectType } from "../../types/video-effect";
import type { VideoOutput, VideoOutputKind } from "../../types/video-output";
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

const stripEffectsHeaderSx = {
  alignItems: "center",
  gap: 0.25,
  px: 0.75,
  py: 0.5,
  borderBottom: 1,
  borderColor: "divider",
  bgcolor: "background.paper",
  minWidth: 0,
} as const;

const stripBodySx = {
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  display: "flex",
  flexDirection: "row",
  overflow: "auto",
} as const;

const stripNameFieldSx = {
  flex: 1,
  minWidth: 0,
  "& .MuiInput-root": { fontSize: 12, fontWeight: 600 },
  "& .MuiInput-input": { py: 0.25 },
} as const;

const faderLabelSx = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.04em",
  color: "text.secondary",
} as const;

const opacitySliderSx = {
  flex: 1,
  mx: "auto",
  color: "primary.main",
  "& .MuiSlider-rail": { width: 3, opacity: 0.35 },
  "& .MuiSlider-track": { width: 3, border: "none" },
  "& .MuiSlider-thumb": { width: 12, height: 12 },
} as const;

/** Edits the master program (name/opacity/effects) — the default destination for unassigned cues. */
export function MasterProgramStrip() {
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
  const [premixerOpen, setPremixerOpen] = useState((masterVideoOutputEffects?.length ?? 0) > 0);
  const effectsHost = { effects: masterVideoOutputEffects };
  const premixerWidth = premixerContentWidth(effectsHost);
  const faderWidth = STRIP_WIDTH;
  const stripWidth = outputStripWidth(premixerOpen, premixerWidth, false, faderWidth);

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
      <Stack direction="row" sx={stripEffectsHeaderSx}>
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
          sx={stripNameFieldSx}
        />
      </Stack>

      <Box sx={stripBodySx}>
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
          <Typography variant="caption" sx={faderLabelSx}>
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
            sx={opacitySliderSx}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: 10, lineHeight: 1.4 }}
          >
            {t("videoOutput.masterStripHint")}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}

interface ProgramBusStripProps {
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

/** Edits a program bus (name/opacity/effects) that cues route to via videoBusId. */
export function ProgramBusStrip({
  bus,
  canEdit,
  onUpdate,
  onRemove,
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect,
  onReorderEffect,
}: ProgramBusStripProps) {
  const { t } = useTranslation();
  const [premixerOpen, setPremixerOpen] = useState((bus.effects?.length ?? 0) > 0);
  const premixerWidth = premixerContentWidth(bus);
  const faderWidth = STRIP_WIDTH;
  const stripWidth = outputStripWidth(premixerOpen, premixerWidth, false, faderWidth);

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
      <Stack direction="row" sx={stripEffectsHeaderSx}>
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
          sx={stripNameFieldSx}
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

      <Box sx={stripBodySx}>
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
          <Typography variant="caption" sx={faderLabelSx}>
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
            sx={opacitySliderSx}
          />
        </Stack>
      </Box>
    </Box>
  );
}

interface DestinationOutputStripProps {
  output: VideoOutput;
  buses: VideoBus[];
  preview: OutputPreviewDestination | undefined;
  canEdit: boolean;
  onUpdate: (patch: Partial<Omit<VideoOutput, "id">>) => void;
  onRemove: () => void;
}

/** Edits a destination (name/kind/program bus/frame) that displays a program bus in an output window. */
export function DestinationOutputStrip({
  output,
  buses,
  preview,
  canEdit,
  onUpdate,
  onRemove,
}: DestinationOutputStripProps) {
  const { t } = useTranslation();
  const previewSourceValue = useFramePreviewSource(preview);
  const [openError, setOpenError] = useState<string | null>(null);
  const [frameOpen, setFrameOpen] = useState(isOutputFrameActive(output.outputFrame));
  const faderWidth = STRIP_WIDTH;
  const stripWidth = outputStripWidth(false, 0, frameOpen, faderWidth);

  const handleOpen = useCallback(async () => {
    setOpenError(null);
    try {
      await openOutputWindow({ outputId: output.id, outputName: output.name });
    } catch {
      setOpenError(t("output.openFailed"));
    }
  }, [output.id, output.name, t]);

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
      <Stack direction="row" sx={stripEffectsHeaderSx}>
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
          value={output.name}
          disabled={!canEdit}
          onChange={(event) => onUpdate({ name: event.target.value })}
          variant="standard"
          sx={stripNameFieldSx}
        />
        {canEdit && (
          <IconButton
            size="small"
            title={t("videoOutput.removeOutput")}
            aria-label={t("videoOutput.removeOutput")}
            onClick={onRemove}
            sx={{ flexShrink: 0, p: 0.5 }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Stack>

      <Box sx={stripBodySx}>
        {frameOpen && (
          <VideoOutputFramePanel
            preview={previewSourceValue}
            frame={output.outputFrame}
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
            overflow: "auto",
          }}
        >
          <Typography variant="caption" sx={faderLabelSx}>
            {t("videoOutput.kind")}
          </Typography>
          <Select
            size="small"
            value={output.kind}
            disabled={!canEdit}
            onChange={(event) => onUpdate({ kind: event.target.value as VideoOutputKind })}
            sx={{ fontSize: 12 }}
          >
            <MenuItem value="window" sx={{ fontSize: 12 }}>
              {t("videoOutput.kindWindow")}
            </MenuItem>
            <MenuItem value="ndi" sx={{ fontSize: 12 }}>
              {t("videoOutput.kindNdi")}
            </MenuItem>
          </Select>

          <Typography variant="caption" sx={faderLabelSx}>
            {t("videoOutput.programBus")}
          </Typography>
          <Select
            size="small"
            value={output.busId ?? ""}
            disabled={!canEdit}
            displayEmpty
            onChange={(event) => {
              const value = event.target.value;
              onUpdate({ busId: value ? value : undefined });
            }}
            sx={{ fontSize: 12 }}
          >
            <MenuItem value="" sx={{ fontSize: 12 }}>
              {t("videoOutput.busMaster")}
            </MenuItem>
            {buses.map((bus) => (
              <MenuItem key={bus.id} value={bus.id} sx={{ fontSize: 12 }}>
                {bus.name}
              </MenuItem>
            ))}
          </Select>

          <Button
            variant="outlined"
            size="small"
            startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
            onClick={handleOpen}
            sx={{ minWidth: 0, px: 0.75, fontSize: 11 }}
          >
            {t("videoOutput.openWindow")}
          </Button>
          {output.kind === "ndi" && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: 10, lineHeight: 1.4 }}
            >
              {t("videoOutput.ndiCaptureHint")}
            </Typography>
          )}
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
