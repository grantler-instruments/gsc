import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "../../stores/preferences";
import type { DeviceOption } from "../../types/device";
import { inspectorFieldLabelSx, inspectorFieldSx, inspectorFieldsSx } from "../inspectorSx";
import { MidiMapPanel } from "../MidiMapPanel";
import { DEFAULT_SELECT_VALUE } from "./types";

interface SettingsMidiPanelProps {
  isTauri: boolean;
  midiOutDevices: DeviceOption[];
  midiInDevices: DeviceOption[];
  loadError: string | null;
}

export function SettingsMidiPanel({
  isTauri,
  midiOutDevices,
  midiInDevices,
  loadError,
}: SettingsMidiPanelProps) {
  const { t } = useTranslation();
  const midiInterfaceId = usePreferencesStore((s) => s.midiInterfaceId);
  const midiInputId = usePreferencesStore((s) => s.midiInputId);
  const setMidiInterfaceId = usePreferencesStore((s) => s.setMidiInterfaceId);
  const setMidiInputId = usePreferencesStore((s) => s.setMidiInputId);

  return (
    <Stack sx={{ ...inspectorFieldsSx, gap: 2 }}>
      <Box sx={inspectorFieldSx}>
        <Typography component="label" htmlFor="midi-output-select" sx={inspectorFieldLabelSx}>
          {t("settings.midiOutput")}
        </Typography>
        <Select
          id="midi-output-select"
          size="small"
          fullWidth
          value={midiInterfaceId ?? DEFAULT_SELECT_VALUE}
          onChange={(e) => {
            const v = e.target.value;
            setMidiInterfaceId(v === DEFAULT_SELECT_VALUE ? null : v);
          }}
          displayEmpty
        >
          <MenuItem value={DEFAULT_SELECT_VALUE}>{t("common.action.none")}</MenuItem>
          {midiOutDevices.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.label}
            </MenuItem>
          ))}
        </Select>
        {midiOutDevices.length === 0 && !loadError ? (
          <Typography variant="caption" color="text.secondary">
            {isTauri ? t("settings.noMidiOutputs") : t("settings.noMidiOutputsBrowser")}
          </Typography>
        ) : null}
      </Box>

      <Box sx={inspectorFieldSx}>
        <Typography component="label" htmlFor="midi-input-select" sx={inspectorFieldLabelSx}>
          {t("settings.midiInput")}
        </Typography>
        <Select
          id="midi-input-select"
          size="small"
          fullWidth
          value={midiInputId ?? DEFAULT_SELECT_VALUE}
          onChange={(e) => {
            const v = e.target.value;
            setMidiInputId(v === DEFAULT_SELECT_VALUE ? null : v);
          }}
          displayEmpty
        >
          <MenuItem value={DEFAULT_SELECT_VALUE}>{t("common.action.none")}</MenuItem>
          {midiInDevices.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.label}
            </MenuItem>
          ))}
        </Select>
        {midiInDevices.length === 0 && !loadError ? (
          <Typography variant="caption" color="text.secondary">
            {isTauri ? t("settings.noMidiInputs") : t("settings.noMidiInputsBrowser")}
          </Typography>
        ) : null}
      </Box>

      <Divider />

      <MidiMapPanel />
    </Stack>
  );
}
