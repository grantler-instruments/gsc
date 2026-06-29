import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  estimateStorage,
  formatStorageBytes,
  getStoragePressure,
  type StoragePressure,
} from "../../lib/storage-persistence";
import { listAudioOutputDevices } from "../../platform/audio-devices";
import { isEnttecProConnected, isEnttecProWebSerialAvailable } from "../../platform/enttec-pro";
import { listMidiOutputDevices } from "../../platform/midi-devices";
import { listMidiInputDevices } from "../../platform/midi-input-devices";
import { listSerialPorts } from "../../platform/serial-ports";
import { usePreferencesStore } from "../../stores/preferences";
import type { DeviceOption } from "../../types/device";

export function useSettingsDevices(open: boolean, isTauri: boolean) {
  const { t } = useTranslation();
  const dmxOutputBackend = usePreferencesStore((s) => s.dmxOutputBackend);
  const setDmxOutputBackend = usePreferencesStore((s) => s.setDmxOutputBackend);

  const [audioDevices, setAudioDevices] = useState<DeviceOption[]>([]);
  const [midiOutDevices, setMidiOutDevices] = useState<DeviceOption[]>([]);
  const [midiInDevices, setMidiInDevices] = useState<DeviceOption[]>([]);
  const [serialPorts, setSerialPorts] = useState<DeviceOption[]>([]);
  const [enttecConnected, setEnttecConnected] = useState(false);
  const [webSerialAvailable, setWebSerialAvailable] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [storageLabel, setStorageLabel] = useState<string | null>(null);
  const [storagePressure, setStoragePressure] = useState<StoragePressure>("ok");
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null);

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

  useEffect(() => {
    if (!open || isTauri) return;

    let cancelled = false;
    void (async () => {
      const [estimate, pressure, persisted] = await Promise.all([
        estimateStorage(),
        getStoragePressure(),
        navigator.storage?.persisted?.() ?? Promise.resolve(false),
      ]);
      if (cancelled) return;
      setStoragePressure(pressure);
      setStoragePersisted(persisted);
      if (estimate && estimate.quota > 0) {
        setStorageLabel(
          t("settings.storageUsed", {
            used: formatStorageBytes(estimate.usage),
            quota: formatStorageBytes(estimate.quota),
          }),
        );
      } else {
        setStorageLabel(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isTauri, t]);

  return {
    audioDevices,
    midiOutDevices,
    midiInDevices,
    serialPorts,
    enttecConnected,
    setEnttecConnected,
    webSerialAvailable,
    loadError,
    storageLabel,
    storagePressure,
    storagePersisted,
  };
}
