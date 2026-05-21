import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { listAudioOutputDevices } from "../platform/audio-devices";
import { listMidiOutputDevices } from "../platform/midi-devices";
import { getPlatform } from "../platform";
import { usePreferencesStore } from "../stores/preferences";
import { useUiStore } from "../stores/ui";
import type { DeviceOption } from "../types/device";
import { inspectorFieldLabelSx, inspectorFieldSx } from "./inspectorSx";

const DEFAULT_VALUE = "";

export function SettingsDialog() {
  const open = useUiStore((s) => s.settingsDialogOpen);
  const setOpen = useUiStore((s) => s.setSettingsDialogOpen);
  const isTauri = getPlatform() === "tauri";

  const soundCardId = usePreferencesStore((s) => s.soundCardId);
  const midiInterfaceId = usePreferencesStore((s) => s.midiInterfaceId);
  const setSoundCardId = usePreferencesStore((s) => s.setSoundCardId);
  const setMidiInterfaceId = usePreferencesStore((s) => s.setMidiInterfaceId);

  const [audioDevices, setAudioDevices] = useState<DeviceOption[]>([]);
  const [midiDevices, setMidiDevices] = useState<DeviceOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadError(null);

    void (async () => {
      try {
        const [audio, midi] = await Promise.all([
          isTauri ? listAudioOutputDevices() : Promise.resolve([]),
          listMidiOutputDevices(),
        ]);
        if (cancelled) return;
        setAudioDevices(audio);
        setMidiDevices(midi);
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
      maxWidth="xs"
      fullWidth
      aria-labelledby="settings-dialog-title"
    >
      <DialogTitle id="settings-dialog-title">Settings</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {loadError ? (
          <Typography color="error" variant="body2">
            {loadError}
          </Typography>
        ) : null}

        {isTauri ? (
          <Box sx={inspectorFieldSx}>
            <Typography component="label" htmlFor="sound-card-select" sx={inspectorFieldLabelSx}>
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
          <Typography component="label" htmlFor="midi-interface-select" sx={inspectorFieldLabelSx}>
            MIDI interface
          </Typography>
          <Select
            id="midi-interface-select"
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
            {midiDevices.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.label}
              </MenuItem>
            ))}
          </Select>
          {midiDevices.length === 0 && !loadError ? (
            <Typography variant="caption" color="text.secondary">
              {isTauri
                ? "No MIDI outputs found."
                : "No MIDI outputs found. Grant access when the browser prompts."}
            </Typography>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
