import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { cueMeterId, MASTER_METER_ID } from "../../audio/meters";
import { resolveEffectivePan, resolveEffectiveVolume, useFadeStore } from "../../stores/fade";
import { useProjectStore } from "../../stores/project";
import { useTransportStore } from "../../stores/transport";
import type { Cue } from "../../types/cue";
import { AudioBusSelect } from "../cue-inspector/AudioBusSelect";
import { SliderNumberField } from "../SliderNumberField";
import { AudioLevelMeter } from "./AudioLevelMeter";

export const hasCueChannelStrip = (cue: Cue): boolean =>
  cue.type === "audio" || cue.type === "liveAudio" || cue.type === "video";

export function ChannelFader({
  meterId,
  label,
  volume,
  disabled,
  onChange,
}: {
  meterId: string;
  label: string;
  volume: number;
  disabled: boolean;
  onChange: (volume: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <Stack sx={{ flex: 1, minHeight: 130, gap: 0.5 }}>
      <Typography
        variant="caption"
        sx={{ textAlign: "center", fontVariantNumeric: "tabular-nums" }}
      >
        {t("audioMixer.volume")} {Math.round(volume * 100)}%
      </Typography>
      <Stack
        direction="row"
        sx={{ flex: 1, minHeight: 100, justifyContent: "center", gap: 1, py: 1 }}
      >
        <Slider
          orientation="vertical"
          size="small"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          disabled={disabled}
          onChange={(_, v) => onChange(v as number)}
          aria-label={`${label} ${t("audioMixer.volume")}`}
          sx={{
            height: "auto",
            width: 24,
            mx: 1,
            "& .MuiSlider-rail": { width: 3 },
            "& .MuiSlider-track": { width: 3, border: "none" },
            "& .MuiSlider-thumb": { width: 12, height: 12 },
          }}
        />
        <AudioLevelMeter meterId={meterId} label={label} />
      </Stack>
    </Stack>
  );
}

export function CueChannelStrip({
  cue,
  readOnly = false,
  inspector = false,
}: {
  cue: Cue;
  readOnly?: boolean;
  inspector?: boolean;
}) {
  const { t } = useTranslation();
  const active = useTransportStore((s) => s.activeCueIds.includes(cue.id));
  const updateCue = useProjectStore((s) => s.updateCue);
  const frame = useFadeStore((s) => (cue.id in s.fadesByTargetId ? s.frameMs : 0));
  const changeLevel = (property: "volume" | "pan", value: number) => {
    const state = useFadeStore.getState();
    if (state.fadesByTargetId[cue.id]?.property === property) state.clearFade(cue.id);
    updateCue(cue.id, { [property]: value });
  };
  return (
    <Stack
      data-cue-strip={cue.id}
      spacing={1}
      sx={{
        width: inspector ? "100%" : 174,
        minWidth: inspector ? 0 : 174,
        flexShrink: 0,
        height: inspector ? 320 : "100%",
        minHeight: 285,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.default",
        p: 1,
        mr: inspector ? 0 : 1,
      }}
    >
      <Typography noWrap variant="subtitle2" title={`${cue.number} ${cue.name}`}>
        {cue.number} {cue.name}
      </Typography>
      <Typography variant="caption" color={active ? "success.main" : "text.secondary"}>
        {active ? t("audioMixer.playing") : t("audioMixer.idle")}
        {cue.type === "liveAudio"
          ? ` · ${t("audioMixer.liveInput")}`
          : cue.type === "video"
            ? ` · ${t("audioMixer.video")}`
            : ""}
      </Typography>
      {inspector ? (
        <SliderNumberField
          label={t("inspector.pan")}
          value={resolveEffectivePan(cue.id, cue.pan ?? 0, frame || undefined)}
          min={-1}
          max={1}
          step={0.01}
          readOnly={readOnly}
          onChange={(value) => changeLevel("pan", value)}
        />
      ) : (
        <Box sx={{ px: 1 }}>
          <Typography variant="caption">{t("audioMixer.pan")}</Typography>
          <Slider
            size="small"
            min={-1}
            max={1}
            step={0.01}
            disabled={readOnly}
            value={resolveEffectivePan(cue.id, cue.pan ?? 0, frame || undefined)}
            aria-label={`${cue.name} ${t("audioMixer.pan")}`}
            onChange={(_, v) => changeLevel("pan", v as number)}
          />
        </Box>
      )}
      <ChannelFader
        meterId={cueMeterId(cue.id)}
        label={cue.name}
        disabled={readOnly}
        volume={resolveEffectiveVolume(cue.id, cue.volume ?? 1, frame || undefined)}
        onChange={(v) => changeLevel("volume", v)}
      />
      <AudioBusSelect
        value={cue.audioBusId}
        readOnly={readOnly}
        onChange={(audioBusId) => updateCue(cue.id, { audioBusId })}
      />
    </Stack>
  );
}

export function MasterChannelStrip({ readOnly }: { readOnly: boolean }) {
  const { t } = useTranslation();
  const volume = useTransportStore((s) => s.masterVolume);
  const setVolume = useTransportStore((s) => s.setMasterVolume);
  return (
    <Stack
      sx={{
        width: 140,
        minWidth: 140,
        flexShrink: 0,
        p: 1,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.default",
        minHeight: 220,
      }}
    >
      <Typography variant="subtitle2">{t("audioMixer.master")}</Typography>
      <ChannelFader
        meterId={MASTER_METER_ID}
        label={t("audioMixer.master")}
        volume={volume}
        disabled={readOnly}
        onChange={setVolume}
      />
    </Stack>
  );
}
