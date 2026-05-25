import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type SupportedLocale } from "../i18n";
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
import { inspectorFieldLabelSx, inspectorFieldSx, inspectorFieldsSx } from "./inspectorSx";
import { MidiMapPanel } from "./MidiMapPanel";
import { NdiSettingsPanel } from "./NdiSettingsPanel";

const DEFAULT_VALUE = "";

type SettingsCategory = "general" | "audio" | "video" | "dmx" | "midi";

const SETTINGS_CATEGORIES: SettingsCategory[] = ["general", "audio", "video", "dmx", "midi"];

const CATEGORY_LABEL_KEYS: Record<SettingsCategory, string> = {
  general: "settings.categoryGeneral",
  audio: "settings.categoryAudio",
  video: "settings.categoryVideo",
  dmx: "settings.categoryDmx",
  midi: "settings.categoryMidi",
};

export function SettingsDialog() {
  const { t } = useTranslation();
  const open = useUiStore((s) => s.settingsDialogOpen);
  const setOpen = useUiStore((s) => s.setSettingsDialogOpen);
  const isTauri = getPlatform() === "tauri";

  const locale = usePreferencesStore((s) => s.locale);
  const setLocale = usePreferencesStore((s) => s.setLocale);
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

  const [category, setCategory] = useState<SettingsCategory>("general");
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
        setLoadError(err instanceof Error ? err.message : t("settings.loadDevicesError"));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isTauri, t]);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="md"
      fullWidth
      aria-labelledby="settings-dialog-title"
    >
      <DialogTitle id="settings-dialog-title">{t("settings.title")}</DialogTitle>
      <DialogContent sx={{ display: "flex", p: 0, minHeight: 360 }}>
        <List
          component="nav"
          aria-label={t("settings.navAria")}
          sx={{
            width: 168,
            flexShrink: 0,
            borderRight: 1,
            borderColor: "divider",
            py: 1,
          }}
        >
          {SETTINGS_CATEGORIES.map((id) => (
            <ListItemButton
              key={id}
              selected={category === id}
              onClick={() => setCategory(id)}
              sx={{ py: 0.75, px: 2 }}
            >
              <ListItemText
                primary={t(CATEGORY_LABEL_KEYS[id])}
                slotProps={{
                  primary: {
                    variant: "body2",
                    sx: { fontWeight: category === id ? 600 : 400 },
                  },
                }}
              />
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ flex: 1, minWidth: 0, overflow: "auto", p: 2 }}>
          {loadError ? (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {loadError}
            </Typography>
          ) : null}

          {category === "general" ? (
            <Stack sx={inspectorFieldsSx}>
              <Box sx={inspectorFieldSx}>
                <Typography component="label" htmlFor="language-select" sx={inspectorFieldLabelSx}>
                  {t("language.label")}
                </Typography>
                <Select
                  id="language-select"
                  size="small"
                  fullWidth
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as SupportedLocale)}
                >
                  {SUPPORTED_LOCALES.map((code) => (
                    <MenuItem key={code} value={code}>
                      {LOCALE_LABELS[code]}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            </Stack>
          ) : null}

          {category === "audio" ? (
            <Stack sx={inspectorFieldsSx}>
              {isTauri ? (
                <Box sx={inspectorFieldSx}>
                  <Typography
                    component="label"
                    htmlFor="sound-card-select"
                    sx={inspectorFieldLabelSx}
                  >
                    {t("settings.soundCard")}
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
                    <MenuItem value={DEFAULT_VALUE}>{t("settings.systemDefault")}</MenuItem>
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
            </Stack>
          ) : null}

          {category === "video" ? (
            <Stack sx={inspectorFieldsSx}>
              {isTauri ? (
                <NdiSettingsPanel />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t("settings.videoDesktopOnly")}
                </Typography>
              )}
            </Stack>
          ) : null}

          {category === "dmx" ? (
            <Stack sx={inspectorFieldsSx}>
              <Box sx={inspectorFieldSx}>
                {isTauri ? (
                  <>
                    <Typography
                      component="label"
                      htmlFor="dmx-output-select"
                      sx={inspectorFieldLabelSx}
                    >
                      {t("settings.dmxOutput")}
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
                      <MenuItem value="artnet">{t("settings.artNetUdp")}</MenuItem>
                      <MenuItem value="enttec-pro">{t("settings.enttecDmxUsbPro")}</MenuItem>
                    </Select>
                  </>
                ) : (
                  <Typography sx={inspectorFieldLabelSx}>{t("settings.dmxOutput")}</Typography>
                )}
              </Box>

              {isTauri && dmxOutputBackend === "artnet" ? (
                <>
                  <Box sx={inspectorFieldSx}>
                    <Typography component="label" htmlFor="artnet-host" sx={inspectorFieldLabelSx}>
                      {t("settings.artNetHost")}
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
                      {t("settings.artNetPort")}
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
                        {t("settings.enttecSerialPort")}
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
                        <MenuItem value={DEFAULT_VALUE}>{t("common.action.none")}</MenuItem>
                        {serialPorts.map((d) => (
                          <MenuItem key={d.id} value={d.id}>
                            {d.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {serialPorts.length === 0 && !loadError ? (
                        <Typography variant="caption" color="text.secondary">
                          {t("settings.noSerialPorts")}
                        </Typography>
                      ) : null}
                      <Typography variant="caption" color="text.secondary">
                        {enttecConnected
                          ? t("common.state.connected")
                          : t("common.state.notConnected")}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={inspectorFieldSx}>
                      <Typography sx={inspectorFieldLabelSx}>
                        {t("settings.enttecWebSerial")}
                      </Typography>
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
                          {enttecConnected
                            ? t("common.action.disconnect")
                            : t("common.action.connect")}
                        </Button>
                        <Typography variant="caption" color="text.secondary">
                          {enttecConnected
                            ? t("common.state.connected")
                            : webSerialAvailable
                              ? t("settings.grantChromeAccess")
                              : t("settings.webSerialUnavailable")}
                        </Typography>
                      </Stack>
                    </Box>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {t("settings.enttecBaudHint")}
                  </Typography>
                </>
              )}
            </Stack>
          ) : null}

          {category === "midi" ? (
            <Stack sx={{ ...inspectorFieldsSx, gap: 2 }}>
              <Box sx={inspectorFieldSx}>
                <Typography
                  component="label"
                  htmlFor="midi-output-select"
                  sx={inspectorFieldLabelSx}
                >
                  {t("settings.midiOutput")}
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
                  <MenuItem value={DEFAULT_VALUE}>{t("common.action.none")}</MenuItem>
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
                <Typography
                  component="label"
                  htmlFor="midi-input-select"
                  sx={inspectorFieldLabelSx}
                >
                  {t("settings.midiInput")}
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
                  <MenuItem value={DEFAULT_VALUE}>{t("common.action.none")}</MenuItem>
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
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>{t("common.action.close")}</Button>
      </DialogActions>
    </Dialog>
  );
}
