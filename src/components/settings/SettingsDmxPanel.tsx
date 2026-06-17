import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { connectEnttecPro, disconnectEnttecPro } from "../../platform/enttec-pro";
import { type DmxOutputBackend, usePreferencesStore } from "../../stores/preferences";
import type { DeviceOption } from "../../types/device";
import { inspectorFieldLabelSx, inspectorFieldSx, inspectorFieldsSx } from "../inspectorSx";
import { DEFAULT_SELECT_VALUE } from "./types";

interface SettingsDmxPanelProps {
  isTauri: boolean;
  serialPorts: DeviceOption[];
  enttecConnected: boolean;
  setEnttecConnected: (connected: boolean) => void;
  webSerialAvailable: boolean;
  loadError: string | null;
}

export function SettingsDmxPanel({
  isTauri,
  serialPorts,
  enttecConnected,
  setEnttecConnected,
  webSerialAvailable,
  loadError,
}: SettingsDmxPanelProps) {
  const { t } = useTranslation();
  const dmxOutputBackend = usePreferencesStore((s) => s.dmxOutputBackend);
  const artNetHost = usePreferencesStore((s) => s.artNetHost);
  const artNetPort = usePreferencesStore((s) => s.artNetPort);
  const enttecProPortId = usePreferencesStore((s) => s.enttecProPortId);
  const setDmxOutputBackend = usePreferencesStore((s) => s.setDmxOutputBackend);
  const setArtNetHost = usePreferencesStore((s) => s.setArtNetHost);
  const setArtNetPort = usePreferencesStore((s) => s.setArtNetPort);
  const setEnttecProPortId = usePreferencesStore((s) => s.setEnttecProPortId);

  return (
    <Stack sx={inspectorFieldsSx}>
      <Box sx={inspectorFieldSx}>
        {isTauri ? (
          <>
            <Typography component="label" htmlFor="dmx-output-select" sx={inspectorFieldLabelSx}>
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
              <Typography component="label" htmlFor="enttec-port-select" sx={inspectorFieldLabelSx}>
                {t("settings.enttecSerialPort")}
              </Typography>
              <Select
                id="enttec-port-select"
                size="small"
                fullWidth
                value={enttecProPortId ?? DEFAULT_SELECT_VALUE}
                onChange={(e) => {
                  const v = e.target.value;
                  setEnttecProPortId(v === DEFAULT_SELECT_VALUE ? null : v);
                }}
                displayEmpty
              >
                <MenuItem value={DEFAULT_SELECT_VALUE}>{t("common.action.none")}</MenuItem>
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
                {enttecConnected ? t("common.state.connected") : t("common.state.notConnected")}
              </Typography>
            </Box>
          ) : (
            <Box sx={inspectorFieldSx}>
              <Typography sx={inspectorFieldLabelSx}>{t("settings.enttecWebSerial")}</Typography>
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
                  {enttecConnected ? t("common.action.disconnect") : t("common.action.connect")}
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
  );
}
