import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { readBusEffectDragId, setActiveBusEffectDrag, setBusEffectDragData } from "../../lib/drag";
import { busHasVideoEffectType, VIDEO_EFFECT_TYPES } from "../../lib/video-effects";
import type { VideoEffect, VideoEffectParams, VideoEffectType } from "../../types/video-effect";
import {
  BLOOM_INTENSITY_MAX,
  BLOOM_INTENSITY_MIN,
  BLOOM_THRESHOLD_MAX,
  BLOOM_THRESHOLD_MIN,
  BLUR_RADIUS_MAX,
  BLUR_RADIUS_MIN,
  CHROMATIC_OFFSET_MAX,
  CHROMATIC_OFFSET_MIN,
  COLOR_GRADE_BRIGHTNESS_MAX,
  COLOR_GRADE_BRIGHTNESS_MIN,
  COLOR_GRADE_CONTRAST_MAX,
  COLOR_GRADE_CONTRAST_MIN,
  COLOR_GRADE_SATURATION_MAX,
  COLOR_GRADE_SATURATION_MIN,
  DOT_SCREEN_ANGLE_MAX,
  DOT_SCREEN_ANGLE_MIN,
  DOT_SCREEN_SCALE_MAX,
  DOT_SCREEN_SCALE_MIN,
  HUE_MAX,
  HUE_MIN,
  HUE_SATURATION_SHIFT_MAX,
  HUE_SATURATION_SHIFT_MIN,
  PIXELATION_GRANULARITY_MAX,
  PIXELATION_GRANULARITY_MIN,
  SCANLINE_DENSITY_MAX,
  SCANLINE_DENSITY_MIN,
  VIGNETTE_DARKNESS_MAX,
  VIGNETTE_DARKNESS_MIN,
  VIGNETTE_OFFSET_MAX,
  VIGNETTE_OFFSET_MIN,
} from "../../types/video-effect";
import { useClearOnDragEnd } from "../cue-list/useClearOnDragEnd";

export const FX_BLOCK_WIDTH = 108;
export const ADD_EFFECT_COLUMN_WIDTH = 72;
export const PREMIXER_EMPTY_WIDTH = 120;
export const PREMIXER_EFFECTS_PADDING_X = 8;
export const PREMIXER_EFFECTS_GAP = 8;

const horizontalSliderSx = {
  color: "primary.main",
  "& .MuiSlider-rail": { opacity: 0.35 },
} as const;

function effectLabelKey(type: VideoEffectType): `videoOutput.${VideoEffectType}` {
  return `videoOutput.${type}`;
}

interface ParamRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
}

function ParamRow({ label, value, min, max, step, disabled, onChange }: ParamRowProps) {
  return (
    <Stack spacing={0.25}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <Typography variant="caption" sx={{ fontSize: 10, color: "text.secondary" }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: 10, color: "text.secondary" }}>
          {Number.isInteger(step) ? value : value.toFixed(2)}
        </Typography>
      </Stack>
      <Slider
        size="small"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(_, next) => onChange(next as number)}
        sx={horizontalSliderSx}
      />
    </Stack>
  );
}

interface EffectReorderProps {
  canReorder: boolean;
  dropTarget: "before" | "after" | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

interface EffectBlockShellProps {
  title: string;
  enabled: boolean;
  canEdit: boolean;
  onToggle: () => void;
  onRemove: () => void;
  children: React.ReactNode;
  reorder?: EffectReorderProps;
}

function EffectBlockShell({
  title,
  enabled,
  canEdit,
  onToggle,
  onRemove,
  children,
  reorder,
}: EffectBlockShellProps) {
  const { t } = useTranslation();

  return (
    <Box
      onDragOver={reorder?.onDragOver}
      onDragLeave={reorder?.onDragLeave}
      onDrop={reorder?.onDrop}
      sx={{
        width: FX_BLOCK_WIDTH,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        px: 0.75,
        py: 0.75,
        borderRight: 1,
        borderColor: "divider",
        boxShadow:
          reorder?.dropTarget === "before"
            ? (theme) => `inset 2px 0 0 ${theme.palette.primary.main}`
            : reorder?.dropTarget === "after"
              ? (theme) => `inset -2px 0 0 ${theme.palette.primary.main}`
              : undefined,
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography
          variant="caption"
          draggable={reorder?.canReorder}
          onDragStart={reorder?.onDragStart}
          onDragEnd={reorder?.onDragEnd}
          sx={{
            fontSize: 10,
            fontWeight: 700,
            color: "text.secondary",
            ...(reorder?.canReorder && {
              cursor: "grab",
              userSelect: "none",
              "&:active": { cursor: "grabbing" },
            }),
          }}
        >
          {title}
        </Typography>
        {canEdit && (
          <IconButton
            size="small"
            title={t("videoOutput.removeEffect")}
            onClick={onRemove}
            sx={{ p: 0.25 }}
          >
            <CloseIcon sx={{ fontSize: 12 }} />
          </IconButton>
        )}
      </Stack>
      {children}
      <Button
        size="small"
        fullWidth
        variant={enabled ? "contained" : "outlined"}
        disabled={!canEdit}
        onClick={onToggle}
        sx={{ fontSize: 10, py: 0.25, mt: "auto" }}
      >
        {enabled ? t("videoOutput.effectOn") : t("videoOutput.effectOff")}
      </Button>
    </Box>
  );
}

export interface VideoEffectsHost {
  effects?: VideoEffect[];
}

export function premixerContentWidth(host: VideoEffectsHost): number {
  const list = host.effects ?? [];
  const availableTypes = VIDEO_EFFECT_TYPES.filter((type) => !busHasVideoEffectType(host, type));
  const addColumnWidth = availableTypes.length > 0 ? ADD_EFFECT_COLUMN_WIDTH : 0;

  if (list.length === 0) return PREMIXER_EMPTY_WIDTH + addColumnWidth;

  return (
    list.length * FX_BLOCK_WIDTH +
    Math.max(0, list.length - 1) * PREMIXER_EFFECTS_GAP +
    addColumnWidth +
    PREMIXER_EFFECTS_PADDING_X * 2
  );
}

interface VideoBusPremixerProps {
  host: VideoEffectsHost;
  canEdit: boolean;
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

type EffectDropTarget = { id: string; place: "before" | "after" };

export function VideoBusPremixer({
  host,
  canEdit,
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect,
  onReorderEffect,
}: VideoBusPremixerProps) {
  const { t } = useTranslation();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [dropTarget, setDropTarget] = useState<EffectDropTarget | null>(null);
  const effects = host.effects ?? [];
  const canReorder = canEdit && effects.length > 1;

  const clearDropTarget = useCallback(() => {
    setDropTarget(null);
    setActiveBusEffectDrag(null);
  }, []);
  useClearOnDragEnd(clearDropTarget);

  const getEffectReorderProps = useCallback(
    (effectId: string): EffectReorderProps | undefined => {
      if (!canReorder) return undefined;
      return {
        canReorder: true,
        dropTarget: dropTarget?.id === effectId ? dropTarget.place : null,
        onDragStart: (e) => setBusEffectDragData(e.dataTransfer, { effectId }),
        onDragOver: (e) => {
          const draggedId = readBusEffectDragId(e.dataTransfer);
          if (draggedId === null || draggedId === effectId) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const rect = e.currentTarget.getBoundingClientRect();
          const place = e.clientX < rect.left + rect.width / 2 ? "before" : "after";
          setDropTarget({ id: effectId, place });
        },
        onDragLeave: () => setDropTarget((prev) => (prev?.id === effectId ? null : prev)),
        onDrop: (e) => {
          const draggedId = readBusEffectDragId(e.dataTransfer);
          if (draggedId === null) return;
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const place = e.clientX < rect.left + rect.width / 2 ? "before" : "after";
          if (draggedId !== effectId) onReorderEffect(draggedId, effectId, place);
          clearDropTarget();
        },
        onDragEnd: clearDropTarget,
      };
    },
    [canReorder, clearDropTarget, dropTarget, onReorderEffect],
  );

  const availableTypes = VIDEO_EFFECT_TYPES.filter((type) => !busHasVideoEffectType(host, type));

  const addEffectMenu = canEdit && availableTypes.length > 0 && (
    <>
      <Button
        size="small"
        variant="text"
        sx={{ fontSize: 10, py: 0 }}
        onClick={(e) => setMenuAnchor(e.currentTarget)}
      >
        {t("videoOutput.addEffect")}
      </Button>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {availableTypes.map((type) => (
          <MenuItem
            key={type}
            onClick={() => {
              onAddEffect(type);
              setMenuAnchor(null);
            }}
          >
            {t(effectLabelKey(type))}
          </MenuItem>
        ))}
      </Menu>
    </>
  );

  const renderEffect = (effect: VideoEffect) => {
    const common = {
      canEdit,
      reorder: getEffectReorderProps(effect.id),
      onToggle: () => onUpdateEffect(effect.id, { enabled: !effect.enabled }),
      onRemove: () => onRemoveEffect(effect.id),
    };

    switch (effect.type) {
      case "blur":
        return (
          <EffectBlockShell
            key={effect.id}
            title={t("videoOutput.blur")}
            enabled={effect.enabled}
            {...common}
          >
            <ParamRow
              label={t("videoOutput.blurRadius")}
              value={effect.params.radius}
              min={BLUR_RADIUS_MIN}
              max={BLUR_RADIUS_MAX}
              step={0.5}
              disabled={!canEdit}
              onChange={(radius) => onUpdateEffect(effect.id, { params: { radius } })}
            />
            <ParamRow
              label={t("videoOutput.mix")}
              value={effect.params.mix}
              min={0}
              max={1}
              step={0.01}
              disabled={!canEdit}
              onChange={(mix) => onUpdateEffect(effect.id, { params: { mix } })}
            />
          </EffectBlockShell>
        );
      case "vignette":
        return (
          <EffectBlockShell
            key={effect.id}
            title={t("videoOutput.vignette")}
            enabled={effect.enabled}
            {...common}
          >
            <ParamRow
              label={t("videoOutput.vignetteOffset")}
              value={effect.params.offset}
              min={VIGNETTE_OFFSET_MIN}
              max={VIGNETTE_OFFSET_MAX}
              step={0.01}
              disabled={!canEdit}
              onChange={(offset) => onUpdateEffect(effect.id, { params: { offset } })}
            />
            <ParamRow
              label={t("videoOutput.vignetteDarkness")}
              value={effect.params.darkness}
              min={VIGNETTE_DARKNESS_MIN}
              max={VIGNETTE_DARKNESS_MAX}
              step={0.01}
              disabled={!canEdit}
              onChange={(darkness) => onUpdateEffect(effect.id, { params: { darkness } })}
            />
          </EffectBlockShell>
        );
      case "bloom":
        return (
          <EffectBlockShell
            key={effect.id}
            title={t("videoOutput.bloom")}
            enabled={effect.enabled}
            {...common}
          >
            <ParamRow
              label={t("videoOutput.bloomIntensity")}
              value={effect.params.intensity}
              min={BLOOM_INTENSITY_MIN}
              max={BLOOM_INTENSITY_MAX}
              step={0.01}
              disabled={!canEdit}
              onChange={(intensity) => onUpdateEffect(effect.id, { params: { intensity } })}
            />
            <ParamRow
              label={t("videoOutput.bloomThreshold")}
              value={effect.params.threshold}
              min={BLOOM_THRESHOLD_MIN}
              max={BLOOM_THRESHOLD_MAX}
              step={0.01}
              disabled={!canEdit}
              onChange={(threshold) => onUpdateEffect(effect.id, { params: { threshold } })}
            />
          </EffectBlockShell>
        );
      case "noise":
        return (
          <EffectBlockShell
            key={effect.id}
            title={t("videoOutput.noise")}
            enabled={effect.enabled}
            {...common}
          >
            <ParamRow
              label={t("videoOutput.mix")}
              value={effect.params.mix}
              min={0}
              max={1}
              step={0.01}
              disabled={!canEdit}
              onChange={(mix) => onUpdateEffect(effect.id, { params: { mix } })}
            />
          </EffectBlockShell>
        );
      case "sepia":
        return (
          <EffectBlockShell
            key={effect.id}
            title={t("videoOutput.sepia")}
            enabled={effect.enabled}
            {...common}
          >
            <ParamRow
              label={t("videoOutput.mix")}
              value={effect.params.mix}
              min={0}
              max={1}
              step={0.01}
              disabled={!canEdit}
              onChange={(mix) => onUpdateEffect(effect.id, { params: { mix } })}
            />
          </EffectBlockShell>
        );
      case "chromaticAberration":
        return (
          <EffectBlockShell
            key={effect.id}
            title={t("videoOutput.chromaticAberration")}
            enabled={effect.enabled}
            {...common}
          >
            <ParamRow
              label={t("videoOutput.chromaticOffset")}
              value={effect.params.offset}
              min={CHROMATIC_OFFSET_MIN}
              max={CHROMATIC_OFFSET_MAX}
              step={0.01}
              disabled={!canEdit}
              onChange={(offset) => onUpdateEffect(effect.id, { params: { offset } })}
            />
            <ParamRow
              label={t("videoOutput.mix")}
              value={effect.params.mix}
              min={0}
              max={1}
              step={0.01}
              disabled={!canEdit}
              onChange={(mix) => onUpdateEffect(effect.id, { params: { mix } })}
            />
          </EffectBlockShell>
        );
      case "hueSaturation":
        return (
          <EffectBlockShell
            key={effect.id}
            title={t("videoOutput.hueSaturation")}
            enabled={effect.enabled}
            {...common}
          >
            <ParamRow
              label={t("videoOutput.hue")}
              value={effect.params.hue}
              min={HUE_MIN}
              max={HUE_MAX}
              step={0.01}
              disabled={!canEdit}
              onChange={(hue) => onUpdateEffect(effect.id, { params: { hue } })}
            />
            <ParamRow
              label={t("videoOutput.hueSaturationShift")}
              value={effect.params.saturation}
              min={HUE_SATURATION_SHIFT_MIN}
              max={HUE_SATURATION_SHIFT_MAX}
              step={0.01}
              disabled={!canEdit}
              onChange={(saturation) => onUpdateEffect(effect.id, { params: { saturation } })}
            />
          </EffectBlockShell>
        );
      case "pixelation":
        return (
          <EffectBlockShell
            key={effect.id}
            title={t("videoOutput.pixelation")}
            enabled={effect.enabled}
            {...common}
          >
            <ParamRow
              label={t("videoOutput.granularity")}
              value={effect.params.granularity}
              min={PIXELATION_GRANULARITY_MIN}
              max={PIXELATION_GRANULARITY_MAX}
              step={1}
              disabled={!canEdit}
              onChange={(granularity) => onUpdateEffect(effect.id, { params: { granularity } })}
            />
            <ParamRow
              label={t("videoOutput.mix")}
              value={effect.params.mix}
              min={0}
              max={1}
              step={0.01}
              disabled={!canEdit}
              onChange={(mix) => onUpdateEffect(effect.id, { params: { mix } })}
            />
          </EffectBlockShell>
        );
      case "scanline":
        return (
          <EffectBlockShell
            key={effect.id}
            title={t("videoOutput.scanline")}
            enabled={effect.enabled}
            {...common}
          >
            <ParamRow
              label={t("videoOutput.scanlineDensity")}
              value={effect.params.density}
              min={SCANLINE_DENSITY_MIN}
              max={SCANLINE_DENSITY_MAX}
              step={0.05}
              disabled={!canEdit}
              onChange={(density) => onUpdateEffect(effect.id, { params: { density } })}
            />
            <ParamRow
              label={t("videoOutput.mix")}
              value={effect.params.mix}
              min={0}
              max={1}
              step={0.01}
              disabled={!canEdit}
              onChange={(mix) => onUpdateEffect(effect.id, { params: { mix } })}
            />
          </EffectBlockShell>
        );
      case "dotScreen":
        return (
          <EffectBlockShell
            key={effect.id}
            title={t("videoOutput.dotScreen")}
            enabled={effect.enabled}
            {...common}
          >
            <ParamRow
              label={t("videoOutput.dotScreenScale")}
              value={effect.params.scale}
              min={DOT_SCREEN_SCALE_MIN}
              max={DOT_SCREEN_SCALE_MAX}
              step={0.05}
              disabled={!canEdit}
              onChange={(scale) => onUpdateEffect(effect.id, { params: { scale } })}
            />
            <ParamRow
              label={t("videoOutput.dotScreenAngle")}
              value={effect.params.angle}
              min={DOT_SCREEN_ANGLE_MIN}
              max={DOT_SCREEN_ANGLE_MAX}
              step={1}
              disabled={!canEdit}
              onChange={(angle) => onUpdateEffect(effect.id, { params: { angle } })}
            />
            <ParamRow
              label={t("videoOutput.mix")}
              value={effect.params.mix}
              min={0}
              max={1}
              step={0.01}
              disabled={!canEdit}
              onChange={(mix) => onUpdateEffect(effect.id, { params: { mix } })}
            />
          </EffectBlockShell>
        );
      default:
        return (
          <EffectBlockShell
            key={effect.id}
            title={t("videoOutput.colorGrade")}
            enabled={effect.enabled}
            {...common}
          >
            <ParamRow
              label={t("videoOutput.brightness")}
              value={effect.params.brightness}
              min={COLOR_GRADE_BRIGHTNESS_MIN}
              max={COLOR_GRADE_BRIGHTNESS_MAX}
              step={0.01}
              disabled={!canEdit}
              onChange={(brightness) => onUpdateEffect(effect.id, { params: { brightness } })}
            />
            <ParamRow
              label={t("videoOutput.contrast")}
              value={effect.params.contrast}
              min={COLOR_GRADE_CONTRAST_MIN}
              max={COLOR_GRADE_CONTRAST_MAX}
              step={0.01}
              disabled={!canEdit}
              onChange={(contrast) => onUpdateEffect(effect.id, { params: { contrast } })}
            />
            <ParamRow
              label={t("videoOutput.saturation")}
              value={effect.params.saturation}
              min={COLOR_GRADE_SATURATION_MIN}
              max={COLOR_GRADE_SATURATION_MAX}
              step={0.01}
              disabled={!canEdit}
              onChange={(saturation) => onUpdateEffect(effect.id, { params: { saturation } })}
            />
          </EffectBlockShell>
        );
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        bgcolor: "action.hover",
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          px: 1,
          py: 0.5,
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", color: "text.secondary" }}
        >
          {t("videoOutput.premixer")}
        </Typography>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", minWidth: 0 }}>
        {effects.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
              {t("videoOutput.noEffects")}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              overflow: "auto",
              display: "flex",
              gap: 1,
              px: 1,
            }}
          >
            {effects.map(renderEffect)}
          </Box>
        )}

        {addEffectMenu && (
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
            {addEffectMenu}
          </Box>
        )}
      </Box>
    </Box>
  );
}
