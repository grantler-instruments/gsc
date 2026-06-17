import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getPlatform } from "../../platform";
import { useUiStore } from "../../stores/ui";
import { RemoteSettingsPanel } from "../RemoteSettingsPanel";
import { SettingsAudioPanel } from "./SettingsAudioPanel";
import { SettingsDmxPanel } from "./SettingsDmxPanel";
import { SettingsGeneralPanel } from "./SettingsGeneralPanel";
import { SettingsMidiPanel } from "./SettingsMidiPanel";
import { SettingsVideoPanel } from "./SettingsVideoPanel";
import { CATEGORY_LABEL_KEYS, SETTINGS_CATEGORIES, type SettingsCategory } from "./types";
import { useSettingsDevices } from "./useSettingsDevices";

export function SettingsDialog() {
  const { t } = useTranslation();
  const open = useUiStore((s) => s.settingsDialogOpen);
  const setOpen = useUiStore((s) => s.setSettingsDialogOpen);
  const isTauri = getPlatform() === "tauri";

  const [category, setCategory] = useState<SettingsCategory>("general");
  const devices = useSettingsDevices(open, isTauri);

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
          {SETTINGS_CATEGORIES.filter((id) => id !== "remote" || isTauri).map((id) => (
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
          {devices.loadError ? (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {devices.loadError}
            </Typography>
          ) : null}

          {category === "general" ? (
            <SettingsGeneralPanel
              isTauri={isTauri}
              storageLabel={devices.storageLabel}
              storagePressure={devices.storagePressure}
              storagePersisted={devices.storagePersisted}
            />
          ) : null}

          {category === "audio" ? (
            <SettingsAudioPanel isTauri={isTauri} audioDevices={devices.audioDevices} />
          ) : null}

          {category === "video" ? <SettingsVideoPanel isTauri={isTauri} /> : null}

          {category === "dmx" ? (
            <SettingsDmxPanel
              isTauri={isTauri}
              serialPorts={devices.serialPorts}
              enttecConnected={devices.enttecConnected}
              setEnttecConnected={devices.setEnttecConnected}
              webSerialAvailable={devices.webSerialAvailable}
              loadError={devices.loadError}
            />
          ) : null}

          {category === "midi" ? (
            <SettingsMidiPanel
              isTauri={isTauri}
              midiOutDevices={devices.midiOutDevices}
              midiInDevices={devices.midiInDevices}
              loadError={devices.loadError}
            />
          ) : null}

          {category === "remote" && isTauri ? <RemoteSettingsPanel /> : null}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>{t("common.action.close")}</Button>
      </DialogActions>
    </Dialog>
  );
}
