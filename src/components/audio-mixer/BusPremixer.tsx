import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { busHasEffectType } from "../../lib/audio-effects";
import type { AudioBus } from "../../types/audio-bus";
import type {
  AudioEffect,
  AudioEffectType,
  DelayEffectParams,
  EqEffectParams,
  ReverbEffectParams,
} from "../../types/audio-effect";
import {
  DELAY_FEEDBACK_MAX,
  DELAY_TIME_MAX_SEC,
  DELAY_TIME_MIN_SEC,
  EQ_GAIN_MAX_DB,
  EQ_GAIN_MIN_DB,
  REVERB_DECAY_MAX_SEC,
  REVERB_DECAY_MIN_SEC,
} from "../../types/audio-effect";

export const EQ_BAND_WIDTH = 36;
export const EQ_BLOCK_WIDTH = EQ_BAND_WIDTH * 3;
export const FX_BLOCK_WIDTH = 108;
export const FX_SLIDER_HEIGHT = 140;

const horizontalSliderSx = {
  color: "primary.main",
  "& .MuiSlider-rail": { opacity: 0.35 },
} as const;

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

interface EffectBlockShellProps {
  title: string;
  enabled: boolean;
  canEdit: boolean;
  onToggle: () => void;
  onRemove: () => void;
  width: number;
  children: React.ReactNode;
}

function EffectBlockShell({
  title,
  enabled,
  canEdit,
  onToggle,
  onRemove,
  width,
  children,
}: EffectBlockShellProps) {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        width,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        px: 0.75,
        py: 0.75,
        borderRight: 1,
        borderColor: "divider",
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography
          variant="caption"
          sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary" }}
        >
          {title}
        </Typography>
        {canEdit && (
          <IconButton
            size="small"
            title={t("audioMixer.removeEffect")}
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
        {enabled ? t("audioMixer.effectOn") : t("audioMixer.effectOff")}
      </Button>
    </Box>
  );
}

interface EqEffectBlockProps {
  effect: Extract<AudioEffect, { type: "eq" }>;
  canEdit: boolean;
  onUpdate: (params: Partial<EqEffectParams>) => void;
  onToggle: (enabled: boolean) => void;
  onRemove: () => void;
}

function EqEffectBlock({ effect, canEdit, onUpdate, onToggle, onRemove }: EqEffectBlockProps) {
  const { t } = useTranslation();
  const disabled = !canEdit || !effect.enabled;

  return (
    <EffectBlockShell
      title={t("audioMixer.eq")}
      enabled={effect.enabled}
      canEdit={canEdit}
      onToggle={() => onToggle(!effect.enabled)}
      onRemove={onRemove}
      width={EQ_BLOCK_WIDTH}
    >
      <Box
        sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between", mx: "auto" }}
      >
        {(
          [
            ["eqLow", effect.params.lowGain, (v: number) => onUpdate({ lowGain: v })],
            ["eqMid", effect.params.midGain, (v: number) => onUpdate({ midGain: v })],
            ["eqHigh", effect.params.highGain, (v: number) => onUpdate({ highGain: v })],
          ] as const
        ).map(([key, value, onChange]) => (
          <Box
            key={key}
            sx={{
              width: EQ_BAND_WIDTH,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <Box
              sx={{
                width: EQ_BAND_WIDTH,
                height: FX_SLIDER_HEIGHT,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Slider
                size="small"
                orientation="vertical"
                min={EQ_GAIN_MIN_DB}
                max={EQ_GAIN_MAX_DB}
                step={0.5}
                value={value}
                disabled={disabled}
                onChange={(_, next) => onChange(next as number)}
                sx={verticalSliderSx}
              />
            </Box>
            <Typography variant="caption" sx={{ fontSize: 10, color: "text.secondary" }}>
              {t(`audioMixer.${key}`)}
            </Typography>
          </Box>
        ))}
      </Box>
    </EffectBlockShell>
  );
}

interface DelayEffectBlockProps {
  effect: Extract<AudioEffect, { type: "delay" }>;
  canEdit: boolean;
  onUpdate: (params: Partial<DelayEffectParams>) => void;
  onToggle: (enabled: boolean) => void;
  onRemove: () => void;
}

function DelayEffectBlock({
  effect,
  canEdit,
  onUpdate,
  onToggle,
  onRemove,
}: DelayEffectBlockProps) {
  const { t } = useTranslation();
  const disabled = !canEdit || !effect.enabled;

  return (
    <EffectBlockShell
      title={t("audioMixer.delay")}
      enabled={effect.enabled}
      canEdit={canEdit}
      onToggle={() => onToggle(!effect.enabled)}
      onRemove={onRemove}
      width={FX_BLOCK_WIDTH}
    >
      <Stack spacing={0.75} sx={{ flex: 1, justifyContent: "center" }}>
        <ParamRow
          label={t("audioMixer.delayTime")}
          value={effect.params.timeSec}
          min={DELAY_TIME_MIN_SEC}
          max={DELAY_TIME_MAX_SEC}
          step={0.01}
          disabled={disabled}
          onChange={(timeSec) => onUpdate({ timeSec })}
        />
        <ParamRow
          label={t("audioMixer.delayFeedback")}
          value={effect.params.feedback}
          min={0}
          max={DELAY_FEEDBACK_MAX}
          step={0.01}
          disabled={disabled}
          onChange={(feedback) => onUpdate({ feedback })}
        />
        <ParamRow
          label={t("audioMixer.mix")}
          value={effect.params.mix}
          min={0}
          max={1}
          step={0.01}
          disabled={disabled}
          onChange={(mix) => onUpdate({ mix })}
        />
      </Stack>
    </EffectBlockShell>
  );
}

interface ReverbEffectBlockProps {
  effect: Extract<AudioEffect, { type: "reverb" }>;
  canEdit: boolean;
  onUpdate: (params: Partial<ReverbEffectParams>) => void;
  onToggle: (enabled: boolean) => void;
  onRemove: () => void;
}

function ReverbEffectBlock({
  effect,
  canEdit,
  onUpdate,
  onToggle,
  onRemove,
}: ReverbEffectBlockProps) {
  const { t } = useTranslation();
  const disabled = !canEdit || !effect.enabled;

  return (
    <EffectBlockShell
      title={t("audioMixer.reverb")}
      enabled={effect.enabled}
      canEdit={canEdit}
      onToggle={() => onToggle(!effect.enabled)}
      onRemove={onRemove}
      width={FX_BLOCK_WIDTH}
    >
      <Stack spacing={0.75} sx={{ flex: 1, justifyContent: "center" }}>
        <ParamRow
          label={t("audioMixer.reverbDecay")}
          value={effect.params.decaySec}
          min={REVERB_DECAY_MIN_SEC}
          max={REVERB_DECAY_MAX_SEC}
          step={0.1}
          disabled={disabled}
          onChange={(decaySec) => onUpdate({ decaySec })}
        />
        <ParamRow
          label={t("audioMixer.mix")}
          value={effect.params.mix}
          min={0}
          max={1}
          step={0.01}
          disabled={disabled}
          onChange={(mix) => onUpdate({ mix })}
        />
      </Stack>
    </EffectBlockShell>
  );
}

export function premixerContentWidth(effects: AudioEffect[] | undefined): number {
  const list = effects ?? [];
  if (list.length === 0) return 120;
  return list.reduce((width, effect) => {
    if (effect.type === "eq") return width + EQ_BLOCK_WIDTH;
    return width + FX_BLOCK_WIDTH;
  }, 0);
}

interface BusPremixerProps {
  bus: AudioBus;
  canEdit: boolean;
  onAddEffect: (type: AudioEffectType) => void;
  onUpdateEffect: (
    effectId: string,
    patch: {
      params?: Partial<EqEffectParams & DelayEffectParams & ReverbEffectParams>;
      enabled?: boolean;
    },
  ) => void;
  onRemoveEffect: (effectId: string) => void;
}

export function BusPremixer({
  bus,
  canEdit,
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect,
}: BusPremixerProps) {
  const { t } = useTranslation();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const effects = bus.effects ?? [];

  const availableTypes: AudioEffectType[] = (["eq", "delay", "reverb"] as const).filter(
    (type) => !busHasEffectType(bus, type),
  );

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
          justifyContent: "space-between",
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
          {t("audioMixer.premixer")}
        </Typography>
        {canEdit && availableTypes.length > 0 && (
          <>
            <Button
              size="small"
              variant="text"
              sx={{ fontSize: 10, py: 0 }}
              onClick={(e) => setMenuAnchor(e.currentTarget)}
            >
              {t("audioMixer.addEffect")}
            </Button>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
            >
              {availableTypes.includes("eq") && (
                <MenuItem
                  onClick={() => {
                    onAddEffect("eq");
                    setMenuAnchor(null);
                  }}
                >
                  {t("audioMixer.eq")}
                </MenuItem>
              )}
              {availableTypes.includes("delay") && (
                <MenuItem
                  onClick={() => {
                    onAddEffect("delay");
                    setMenuAnchor(null);
                  }}
                >
                  {t("audioMixer.delay")}
                </MenuItem>
              )}
              {availableTypes.includes("reverb") && (
                <MenuItem
                  onClick={() => {
                    onAddEffect("reverb");
                    setMenuAnchor(null);
                  }}
                >
                  {t("audioMixer.reverb")}
                </MenuItem>
              )}
            </Menu>
          </>
        )}
      </Stack>

      {effects.length === 0 ? (
        <Box
          sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", px: 1 }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
            {t("audioMixer.noEffects")}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{ flex: 1, minHeight: 0, overflowX: "auto", overflowY: "hidden", display: "flex" }}
        >
          {effects.map((effect) => {
            const common = {
              canEdit,
              onUpdate: (
                params: Partial<EqEffectParams & DelayEffectParams & ReverbEffectParams>,
              ) => onUpdateEffect(effect.id, { params }),
              onToggle: (enabled: boolean) => onUpdateEffect(effect.id, { enabled }),
              onRemove: () => onRemoveEffect(effect.id),
            };

            if (effect.type === "eq") {
              return (
                <EqEffectBlock
                  key={effect.id}
                  effect={effect}
                  {...common}
                  onUpdate={common.onUpdate}
                />
              );
            }
            if (effect.type === "delay") {
              return (
                <DelayEffectBlock
                  key={effect.id}
                  effect={effect}
                  {...common}
                  onUpdate={common.onUpdate}
                />
              );
            }
            return (
              <ReverbEffectBlock
                key={effect.id}
                effect={effect}
                {...common}
                onUpdate={common.onUpdate}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
}
