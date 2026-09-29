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
    let refreshGeneration = 0;
    const mediaDevices = navigator.mediaDevices;
    const refresh = async () => {
      const generation = ++refreshGeneration;
      try {
        const stream = await openAudioInputStream(deviceId ?? undefined);
        let reportedCount = 1;
        try {
          const track = stream.getAudioTracks()[0];
          const capabilities = track?.getCapabilities?.();
          const settings = track?.getSettings();
          reportedCount = Math.max(
            capabilities?.channelCount?.max ?? 1,
            settings?.channelCount ?? 1,
          );
        } finally {
          // Release the input before awaiting anything else so the probe never holds it open.
          closeAudioInputStream(stream);
        }
        const count = Number.isFinite(reportedCount) ? Math.max(1, Math.floor(reportedCount)) : 1;
        const available = await mediaDevices?.enumerateDevices();
        if (!cancelled && generation === refreshGeneration) {
          setDevices(available ?? []);
          setInputChannels({ deviceId, count });
        }
      } catch {
        if (!cancelled && generation === refreshGeneration) {
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
