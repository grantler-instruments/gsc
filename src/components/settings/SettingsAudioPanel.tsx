import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "../../stores/preferences";
import type { DeviceOption } from "../../types/device";
import { inspectorFieldLabelSx, inspectorFieldSx, inspectorFieldsSx } from "../inspectorSx";
import { DEFAULT_SELECT_VALUE } from "./types";

interface SettingsAudioPanelProps {
  isTauri: boolean;
  audioDevices: DeviceOption[];
  audioInputDevices: DeviceOption[];
}

export function SettingsAudioPanel({
  isTauri,
  audioDevices,
  audioInputDevices,
}: SettingsAudioPanelProps) {
  const { t } = useTranslation();
  const soundCardId = usePreferencesStore((s) => s.soundCardId);
  const setSoundCardId = usePreferencesStore((s) => s.setSoundCardId);
  const audioInputDeviceId = usePreferencesStore((s) => s.audioInputDeviceId);
  const setAudioInputDeviceId = usePreferencesStore((s) => s.setAudioInputDeviceId);

  return (
    <Stack sx={inspectorFieldsSx}>
      {isTauri ? (
        <Box sx={inspectorFieldSx}>
          <Typography component="label" htmlFor="sound-card-select" sx={inspectorFieldLabelSx}>
            {t("settings.soundCard")}
          </Typography>
          <Select
            id="sound-card-select"
            size="small"
            fullWidth
            value={soundCardId ?? DEFAULT_SELECT_VALUE}
            onChange={(e) => {
              const v = e.target.value;
              setSoundCardId(v === DEFAULT_SELECT_VALUE ? null : v);
            }}
            displayEmpty
          >
            <MenuItem value={DEFAULT_SELECT_VALUE}>{t("settings.systemDefault")}</MenuItem>
            {audioDevices.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.label}
              </MenuItem>
            ))}
          </Select>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t("settings.audioDesktopOnly")}
        </Typography>
      )}
      <Box sx={inspectorFieldSx}>
        <Typography component="label" htmlFor="audio-input-select" sx={inspectorFieldLabelSx}>
          {t("settings.audioInput")}
        </Typography>
        <Select
          id="audio-input-select"
          size="small"
          fullWidth
          value={audioInputDeviceId ?? DEFAULT_SELECT_VALUE}
          onChange={(e) => {
            const v = e.target.value;
            setAudioInputDeviceId(
              v === DEFAULT_SELECT_VALUE ? null : v,
              audioInputDevices.find((device) => device.id === v)?.label ?? null,
            );
          }}
          displayEmpty
        >
          <MenuItem value={DEFAULT_SELECT_VALUE}>{t("settings.systemDefault")}</MenuItem>
          {audioInputDevices.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.label}
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Stack>
  );
}
