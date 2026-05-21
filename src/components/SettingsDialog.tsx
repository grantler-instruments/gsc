import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { listAudioOutputDevices } from "../platform/audio-devices";
import { listMidiInputDevices } from "../platform/midi-input-devices";
import { listMidiOutputDevices } from "../platform/midi-devices";
import { getPlatform } from "../platform";
import { usePreferencesStore } from "../stores/preferences";
import { useUiStore } from "../stores/ui";
import type { DeviceOption } from "../types/device";
import { MidiMapPanel } from "./MidiMapPanel";
import { inspectorFieldLabelSx, inspectorFieldSx } from "./inspectorSx";

const DEFAULT_VALUE = "";

type SettingsTab = "devices" | "midi-map";

export function SettingsDialog() {
  const open = useUiStore((s) => s.settingsDialogOpen);
  const setOpen = useUiStore((s) => s.setSettingsDialogOpen);
  const isTauri = getPlatform() === "tauri";

  const soundCardId = usePreferencesStore((s) => s.soundCardId);
  const midiInterfaceId = usePreferencesStore((s) => s.midiInterfaceId);
  const midiInputId = usePreferencesStore((s) => s.midiInputId);
  const setSoundCardId = usePreferencesStore((s) => s.setSoundCardId);
  const setMidiInterfaceId = usePreferencesStore((s) => s.setMidiInterfaceId);
  const setMidiInputId = usePreferencesStore((s) => s.setMidiInputId);

  const [tab, setTab] = useState<SettingsTab>("devices");
  const [audioDevices, setAudioDevices] = useState<DeviceOption[]>([]);
  const [midiOutDevices, setMidiOutDevices] = useState<DeviceOption[]>([]);
  const [midiInDevices, setMidiInDevices] = useState<DeviceOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadError(null);

    void (async () => {
      try {
        const [audio, midiOut, midiIn] = await Promise.all([
          isTauri ? listAudioOutputDevices() : Promise.resolve([]),
          listMidiOutputDevices(),
          listMidiInputDevices(),
        ]);
        if (cancelled) return;
        setAudioDevices(audio);
        setMidiOutDevices(midiOut);
        setMidiInDevices(midiIn);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load devices");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isTauri]);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="sm"
      fullWidth
      aria-labelledby="settings-dialog-title"
    >
      <DialogTitle id="settings-dialog-title">Settings</DialogTitle>
      <Tabs
        value={tab}
        onChange={(_, v: SettingsTab) => setTab(v)}
        sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab value="devices" label="Devices" />
        <Tab value="midi-map" label="MIDI map" />
      </Tabs>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        {loadError ? (
          <Typography color="error" variant="body2">
            {loadError}
          </Typography>
        ) : null}

        {tab === "devices" ? (
          <>
            {isTauri ? (
              <Box sx={inspectorFieldSx}>
                <Typography
                  component="label"
                  htmlFor="sound-card-select"
                  sx={inspectorFieldLabelSx}
                >
                  Sound card
                </Typography>
                <Select
                  id="sound-card-select"
                  size="small"
                  fullWidth
                  value={soundCardId ?? DEFAULT_VALUE}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSoundCardId(v === DEFAULT_VALUE ? null : v);
                  }}
                  displayEmpty
                >
                  <MenuItem value={DEFAULT_VALUE}>System default</MenuItem>
                  {audioDevices.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.label}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            ) : null}

            <Box sx={inspectorFieldSx}>
              <Typography
                component="label"
                htmlFor="midi-output-select"
                sx={inspectorFieldLabelSx}
              >
                MIDI output
              </Typography>
              <Select
                id="midi-output-select"
                size="small"
                fullWidth
                value={midiInterfaceId ?? DEFAULT_VALUE}
                onChange={(e) => {
                  const v = e.target.value;
                  setMidiInterfaceId(v === DEFAULT_VALUE ? null : v);
                }}
                displayEmpty
              >
                <MenuItem value={DEFAULT_VALUE}>None</MenuItem>
                {midiOutDevices.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.label}
                  </MenuItem>
                ))}
              </Select>
              {midiOutDevices.length === 0 && !loadError ? (
                <Typography variant="caption" color="text.secondary">
                  {isTauri
                    ? "No MIDI outputs found."
                    : "No MIDI outputs found. Grant access when the browser prompts."}
                </Typography>
              ) : null}
            </Box>

            <Box sx={inspectorFieldSx}>
              <Typography
                component="label"
                htmlFor="midi-input-select"
                sx={inspectorFieldLabelSx}
              >
                MIDI input
              </Typography>
              <Select
                id="midi-input-select"
                size="small"
                fullWidth
                value={midiInputId ?? DEFAULT_VALUE}
                onChange={(e) => {
                  const v = e.target.value;
                  setMidiInputId(v === DEFAULT_VALUE ? null : v);
                }}
                displayEmpty
              >
                <MenuItem value={DEFAULT_VALUE}>None</MenuItem>
                {midiInDevices.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.label}
                  </MenuItem>
                ))}
              </Select>
              {midiInDevices.length === 0 && !loadError ? (
                <Typography variant="caption" color="text.secondary">
                  {isTauri
                    ? "No MIDI inputs found."
                    : "No MIDI inputs found. Grant access when the browser prompts."}
                </Typography>
              ) : null}
            </Box>
          </>
        ) : (
          <MidiMapPanel />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
