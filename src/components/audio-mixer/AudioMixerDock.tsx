import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import GraphicEqOutlinedIcon from "@mui/icons-material/GraphicEqOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_AUDIO_MIXER_HEIGHT, MIN_AUDIO_MIXER_HEIGHT } from "../../lib/audio-mixer-layout";
import { useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import type { AudioBus } from "../../types/audio-bus";
import type { AudioEffectType } from "../../types/audio-effect";
import { BusPremixer, FX_SLIDER_HEIGHT, premixerContentWidth } from "./BusPremixer";

const MIXER_RESIZE_HANDLE_HEIGHT = 6;
const FADER_COLUMN_WIDTH = 72;

const verticalSliderSx = {
  height: FX_SLIDER_HEIGHT,
  width: 24,
  mx: "auto",
  py: 0,
  color: "primary.main",
  "& .MuiSlider-rail": { width: 3, opacity: 0.35 },
  "& .MuiSlider-track": { width: 3, border: "none" },
  "& .MuiSlider-thumb": { width: 12, height: 12 },
} as const;

interface BusStripProps {
  bus: AudioBus;
  canEdit: boolean;
  onUpdate: (patch: Partial<Omit<AudioBus, "id">>) => void;
  onRemove: () => void;
  onAddEffect: (type: AudioEffectType) => void;
  onUpdateEffect: (
    effectId: string,
    patch: { params?: Record<string, number>; enabled?: boolean },
  ) => void;
  onRemoveEffect: (effectId: string) => void;
}

function BusStrip({
  bus,
  canEdit,
  onUpdate,
  onRemove,
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect,
}: BusStripProps) {
  const { t } = useTranslation();
  const [premixerOpen, setPremixerOpen] = useState((bus.effects?.length ?? 0) > 0);
  const premixerWidth = premixerContentWidth(bus.effects);

  return (
    <Box
      sx={{
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        mr: 1,
        width: premixerOpen ? premixerWidth + FADER_COLUMN_WIDTH + 8 : FADER_COLUMN_WIDTH + 16,
        minWidth: premixerOpen ? premixerWidth + FADER_COLUMN_WIDTH + 8 : FADER_COLUMN_WIDTH + 16,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.default",
        overflow: "hidden",
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
          title={premixerOpen ? t("audioMixer.collapsePremixer") : t("audioMixer.expandPremixer")}
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
            title={t("audioMixer.removeBus")}
            onClick={onRemove}
            sx={{ flexShrink: 0, p: 0.5 }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "row" }}>
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
              overflow: "hidden",
            }}
          >
            <BusPremixer
              bus={bus}
              canEdit={canEdit}
              onAddEffect={(type) => {
                onAddEffect(type);
                setPremixerOpen(true);
              }}
              onUpdateEffect={onUpdateEffect}
              onRemoveEffect={onRemoveEffect}
            />
          </Box>
        )}

        <Box
          sx={{
            width: FADER_COLUMN_WIDTH,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.75,
            px: 0.75,
            py: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", color: "text.secondary" }}
          >
            {t("audioMixer.volume")}
          </Typography>
          <Box
            sx={{
              flex: 1,
              width: FADER_COLUMN_WIDTH - 8,
              minHeight: FX_SLIDER_HEIGHT,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Slider
              size="small"
              orientation="vertical"
              min={0}
              max={1}
              step={0.01}
              value={bus.muted ? 0 : bus.volume}
              disabled={!canEdit}
              onChange={(_, value) => onUpdate({ volume: value as number, muted: false })}
              sx={verticalSliderSx}
            />
          </Box>
          <Button
            size="small"
            fullWidth
            variant={bus.muted ? "contained" : "outlined"}
            disabled={!canEdit}
            onClick={() => onUpdate({ muted: !bus.muted })}
            sx={{ fontSize: 10, py: 0.25 }}
          >
            {bus.muted ? t("audioMixer.unmute") : t("audioMixer.mute")}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

interface MixerResizeHandleProps {
  height: number;
  onResize: (height: number) => void;
}

function MixerResizeHandle({ height, onResize }: MixerResizeHandleProps) {
  const { t } = useTranslation();
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const endDrag = (target: EventTarget & Element, pointerId: number) => {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
    dragRef.current = null;
    document.body.style.removeProperty("user-select");
  };

  return (
    <Box
      role="separator"
      aria-orientation="horizontal"
      aria-valuenow={height}
      aria-valuemin={MIN_AUDIO_MIXER_HEIGHT}
      aria-label={t("audioMixer.resize")}
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
        height: MIXER_RESIZE_HANDLE_HEIGHT,
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

export function AudioMixerDock() {
  const { t } = useTranslation();
  const showMode = useUiStore((s) => s.showMode);
  const setAudioMixerOpen = useUiStore((s) => s.setAudioMixerOpen);
  const audioMixerHeight = useUiStore((s) => s.audioMixerHeight);
  const setAudioMixerHeight = useUiStore((s) => s.setAudioMixerHeight);
  const canEdit = !showMode;
  const audioBuses = useProjectStore((s) => s.audioBuses);
  const addAudioBus = useProjectStore((s) => s.addAudioBus);
  const removeAudioBus = useProjectStore((s) => s.removeAudioBus);
  const updateAudioBus = useProjectStore((s) => s.updateAudioBus);
  const addBusEffect = useProjectStore((s) => s.addBusEffect);
  const updateBusEffect = useProjectStore((s) => s.updateBusEffect);
  const removeBusEffect = useProjectStore((s) => s.removeBusEffect);

  const handleAddBus = useCallback(() => {
    addAudioBus();
  }, [addAudioBus]);

  const handleResize = useCallback(
    (nextHeight: number) => {
      setAudioMixerHeight(nextHeight);
    },
    [setAudioMixerHeight],
  );

  return (
    <Box
      sx={{
        height: audioMixerHeight,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        minWidth: 0,
      }}
    >
      <MixerResizeHandle height={audioMixerHeight} onResize={handleResize} />

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
          <GraphicEqOutlinedIcon fontSize="small" color="primary" aria-hidden />
          <Typography variant="subtitle2" sx={{ flex: 1, m: 0 }}>
            {t("audioMixer.title")}
          </Typography>
          <IconButton
            size="small"
            title={t("audioMixer.close")}
            aria-label={t("audioMixer.close")}
            onClick={() => setAudioMixerOpen(false)}
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
              alignItems: audioBuses.length === 0 ? "center" : "stretch",
              justifyContent: audioBuses.length === 0 ? "center" : "flex-start",
              overflowX: "auto",
              overflowY: "hidden",
              px: 1,
              py: 1,
            }}
          >
            {audioBuses.length === 0 ? (
              <Stack sx={{ alignItems: "center", gap: 1, px: 2, py: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {t("audioMixer.empty")}
                </Typography>
                {canEdit && (
                  <Button size="small" variant="outlined" onClick={handleAddBus}>
                    {t("audioMixer.addBus")}
                  </Button>
                )}
              </Stack>
            ) : (
              audioBuses.map((bus) => (
                <BusStrip
                  key={bus.id}
                  bus={bus}
                  canEdit={canEdit}
                  onUpdate={(patch) => updateAudioBus(bus.id, patch)}
                  onRemove={() => removeAudioBus(bus.id)}
                  onAddEffect={(type) => addBusEffect(bus.id, type)}
                  onUpdateEffect={(effectId, patch) => updateBusEffect(bus.id, effectId, patch)}
                  onRemoveEffect={(effectId) => removeBusEffect(bus.id, effectId)}
                />
              ))
            )}
          </Box>

          {canEdit && audioBuses.length > 0 && (
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
                {t("audioMixer.addBus")}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export const audioMixerDockHeight = DEFAULT_AUDIO_MIXER_HEIGHT;
