import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { getPlatform } from "../platform";
import { listAudioOutputDevices } from "../platform/audio-devices";
import {
  connectEnttecPro,
  disconnectEnttecPro,
  isEnttecProConnected,
  isEnttecProWebSerialAvailable,
} from "../platform/enttec-pro";
import { listMidiOutputDevices } from "../platform/midi-devices";
import { listMidiInputDevices } from "../platform/midi-input-devices";
import { listSerialPorts } from "../platform/serial-ports";
import { type DmxOutputBackend, usePreferencesStore } from "../stores/preferences";
import { useUiStore } from "../stores/ui";
import type { DeviceOption } from "../types/device";
import { inspectorFieldLabelSx, inspectorFieldSx } from "./inspectorSx";
import { MidiMapPanel } from "./MidiMapPanel";

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
  const dmxOutputBackend = usePreferencesStore((s) => s.dmxOutputBackend);
  const artNetHost = usePreferencesStore((s) => s.artNetHost);
  const artNetPort = usePreferencesStore((s) => s.artNetPort);
  const enttecProPortId = usePreferencesStore((s) => s.enttecProPortId);
  const setDmxOutputBackend = usePreferencesStore((s) => s.setDmxOutputBackend);
  const setArtNetHost = usePreferencesStore((s) => s.setArtNetHost);
  const setArtNetPort = usePreferencesStore((s) => s.setArtNetPort);
  const setEnttecProPortId = usePreferencesStore((s) => s.setEnttecProPortId);

  const [tab, setTab] = useState<SettingsTab>("devices");
  const [audioDevices, setAudioDevices] = useState<DeviceOption[]>([]);
  const [midiOutDevices, setMidiOutDevices] = useState<DeviceOption[]>([]);
  const [midiInDevices, setMidiInDevices] = useState<DeviceOption[]>([]);
  const [serialPorts, setSerialPorts] = useState<DeviceOption[]>([]);
  const [enttecConnected, setEnttecConnected] = useState(false);
  const [webSerialAvailable, setWebSerialAvailable] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || isTauri) return;
    if (dmxOutputBackend !== "enttec-pro") {
      setDmxOutputBackend("enttec-pro");
    }
  }, [open, isTauri, dmxOutputBackend, setDmxOutputBackend]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadError(null);

    void (async () => {
      try {
        const [audio, midiOut, midiIn, serial] = await Promise.all([
          isTauri ? listAudioOutputDevices() : Promise.resolve([]),
          listMidiOutputDevices(),
          listMidiInputDevices(),
          isTauri ? listSerialPorts() : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setAudioDevices(audio);
        setMidiOutDevices(midiOut);
        setMidiInDevices(midiIn);
        setSerialPorts(serial);
        setEnttecConnected(await isEnttecProConnected());
        setWebSerialAvailable(await isEnttecProWebSerialAvailable());
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
              <Typography component="label" htmlFor="midi-output-select" sx={inspectorFieldLabelSx}>
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
              <Typography component="label" htmlFor="midi-input-select" sx={inspectorFieldLabelSx}>
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

            <Box sx={inspectorFieldSx}>
              {isTauri ? (
                <>
                  <Typography
                    component="label"
                    htmlFor="dmx-output-select"
                    sx={inspectorFieldLabelSx}
                  >
                    DMX output
                  </Typography>
                  <Select
                    id="dmx-output-select"
                    size="small"
                    fullWidth
                    value={dmxOutputBackend}
                    onChange={(e) => {
                      setDmxOutputBackend(e.target.value as DmxOutputBackend);
                    }}
                  >
                    <MenuItem value="artnet">Art-Net (UDP)</MenuItem>
                    <MenuItem value="enttec-pro">Enttec DMX USB Pro</MenuItem>
                  </Select>
                </>
              ) : (
                <Typography sx={inspectorFieldLabelSx}>DMX output</Typography>
              )}
            </Box>

            {isTauri && dmxOutputBackend === "artnet" ? (
              <>
                <Box sx={inspectorFieldSx}>
                  <Typography component="label" htmlFor="artnet-host" sx={inspectorFieldLabelSx}>
                    Art-Net host
                  </Typography>
                  <TextField
                    id="artnet-host"
                    size="small"
                    fullWidth
                    value={artNetHost}
                    onChange={(e) => setArtNetHost(e.target.value)}
                    placeholder="127.0.0.1"
                  />
                </Box>
                <Box sx={inspectorFieldSx}>
                  <Typography component="label" htmlFor="artnet-port" sx={inspectorFieldLabelSx}>
                    Art-Net port
                  </Typography>
                  <TextField
                    id="artnet-port"
                    size="small"
                    fullWidth
                    type="number"
                    slotProps={{ htmlInput: { min: 1, max: 65535 } }}
                    value={artNetPort}
                    onChange={(e) => {
                      const next = Number.parseInt(e.target.value, 10);
                      setArtNetPort(Number.isFinite(next) ? next : 6454);
                    }}
                  />
                </Box>
              </>
            ) : (
              <>
                {isTauri ? (
                  <Box sx={inspectorFieldSx}>
                    <Typography
                      component="label"
                      htmlFor="enttec-port-select"
                      sx={inspectorFieldLabelSx}
                    >
                      Enttec Pro serial port
                    </Typography>
                    <Select
                      id="enttec-port-select"
                      size="small"
                      fullWidth
                      value={enttecProPortId ?? DEFAULT_VALUE}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEnttecProPortId(v === DEFAULT_VALUE ? null : v);
                      }}
                      displayEmpty
                    >
                      <MenuItem value={DEFAULT_VALUE}>None</MenuItem>
                      {serialPorts.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {serialPorts.length === 0 && !loadError ? (
                      <Typography variant="caption" color="text.secondary">
                        No serial ports found. Plug in the Enttec interface and reopen Settings.
                      </Typography>
                    ) : null}
                    <Typography variant="caption" color="text.secondary">
                      {enttecConnected ? "Connected" : "Not connected"}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={inspectorFieldSx}>
                    <Typography sx={inspectorFieldLabelSx}>Enttec Pro (Web Serial)</Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!webSerialAvailable}
                        onClick={() => {
                          void (async () => {
                            if (enttecConnected) {
                              await disconnectEnttecPro();
                              setEnttecConnected(false);
                              return;
                            }
                            const connected = await connectEnttecPro(null);
                            setEnttecConnected(connected);
                          })();
                        }}
                      >
                        {enttecConnected ? "Disconnect" : "Connect"}
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        {enttecConnected
                          ? "Connected"
                          : webSerialAvailable
                            ? "Grant access when Chrome prompts"
                            : "Web Serial is not available in this browser"}
                      </Typography>
                    </Stack>
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                  57600 baud · universe 1 (Pro) · universes 1–2 (Pro MK2)
                </Typography>
              </>
            )}
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
