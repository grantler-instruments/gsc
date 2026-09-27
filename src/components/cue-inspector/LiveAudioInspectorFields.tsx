import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { closeAudioInputStream, openAudioInputStream } from "../../lib/audio-input";
import { usePreferencesStore } from "../../stores/preferences";
import type { Cue } from "../../types/cue";
import { inspectorFieldLabelSx, inspectorFieldSx } from "../inspectorSx";
import { AudioBusSelect } from "./AudioBusSelect";

interface Props {
  cue: Cue;
  readOnly: boolean;
  onChange: (patch: Partial<Cue>) => void;
}

export function LiveAudioInspectorFields({ cue, readOnly, onChange }: Props) {
  const { t } = useTranslation();
  const deviceId = usePreferencesStore((state) => state.audioInputDeviceId);
  const savedDeviceLabel = usePreferencesStore((state) => state.audioInputDeviceLabel);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [inputChannels, setInputChannels] = useState<{
    deviceId: string | null;
    count: number;
  } | null>(null);
  const channelCount = inputChannels?.deviceId === deviceId ? inputChannels.count : null;

  useEffect(() => {
    let cancelled = false;
    const mediaDevices = navigator.mediaDevices;
    const refresh = async () => {
      try {
        const stream = await openAudioInputStream(deviceId ?? undefined);
        try {
          const track = stream.getAudioTracks()[0];
          const reportedCount =
            track?.getCapabilities?.().channelCount?.max ?? track?.getSettings().channelCount ?? 1;
          const count = Number.isFinite(reportedCount) ? Math.max(1, Math.floor(reportedCount)) : 1;
          const available = await mediaDevices?.enumerateDevices();
          if (!cancelled) {
            setDevices(available ?? []);
            setInputChannels({ deviceId, count });
          }
        } finally {
          closeAudioInputStream(stream);
        }
      } catch {
        if (!cancelled) {
          setDevices([]);
          setInputChannels(null);
        }
      }
    };
    void refresh();
    mediaDevices?.addEventListener("devicechange", refresh);
    return () => {
      cancelled = true;
      mediaDevices?.removeEventListener("devicechange", refresh);
    };
  }, [deviceId]);

  useEffect(() => {
    if (!readOnly && channelCount !== null && (cue.liveAudioChannel ?? 1) > channelCount) {
      onChange({ liveAudioChannel: 1 });
    }
  }, [channelCount, cue.liveAudioChannel, onChange, readOnly]);

  const device = devices.find(
    (item) => item.kind === "audioinput" && item.deviceId === (deviceId ?? "default"),
  );
  const deviceLabel =
    device?.label || savedDeviceLabel || (deviceId ? null : t("settings.systemDefault"));

  if (cue.type !== "liveAudio") return null;
  return (
    <Box sx={inspectorFieldSx}>
      <AudioBusSelect
        value={cue.audioBusId}
        readOnly={readOnly}
        onChange={(audioBusId) => onChange({ audioBusId })}
      />
      <Typography component="label" htmlFor="live-audio-channel-select" sx={inspectorFieldLabelSx}>
        {t("inspector.audioChannel")}
        {deviceLabel ? ` (${deviceLabel})` : ""}
      </Typography>
      <Select
        id="live-audio-channel-select"
        size="small"
        fullWidth
        disabled={readOnly || channelCount === null}
        value={Math.min(cue.liveAudioChannel ?? 1, channelCount ?? 1)}
        onChange={(e) => onChange({ liveAudioChannel: Number(e.target.value) })}
      >
        {Array.from({ length: channelCount ?? 1 }, (_, index) => index + 1).map((channel) => (
          <MenuItem key={channel} value={channel}>
            {channel}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
