import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { type SupportedLocale, setAppLocale } from "../i18n";
import { DEFAULT_ART_NET_HOST, DEFAULT_ART_NET_PORT } from "../lib/dmx";
import { getPlatform, type PlatformKind } from "../platform";
import {
  DEFAULT_NDI_OUTPUT_FPS,
  DEFAULT_NDI_OUTPUT_HEIGHT,
  DEFAULT_NDI_OUTPUT_WIDTH,
  DEFAULT_NDI_SOURCE_NAME,
} from "../types/ndi";

export type DmxOutputBackend = "artnet" | "enttec-pro";

/** Art-Net is desktop-only; web always uses Enttec Pro via Web Serial. */
export function resolveDmxOutputBackend(
  backend: DmxOutputBackend,
  platform: PlatformKind = getPlatform(),
): DmxOutputBackend {
  if (platform === "web") return "enttec-pro";
  return backend;
}

interface PreferencesState {
  locale: SupportedLocale;
  /** Tauri: selected audio output device id (device name from cpal). */
  soundCardId: string | null;
  /** Web MIDI output id or Tauri MIDI port index (output). */
  midiInterfaceId: string | null;
  /** Web MIDI input id or Tauri MIDI port index (input). */
  midiInputId: string | null;
  dmxOutputBackend: DmxOutputBackend;
  artNetHost: string;
  artNetPort: number;
  /** Tauri serial port path for Enttec Pro. */
  enttecProPortId: string | null;
  setLocale: (locale: SupportedLocale) => void;
  setSoundCardId: (soundCardId: string | null) => void;
  setMidiInterfaceId: (midiInterfaceId: string | null) => void;
  setMidiInputId: (midiInputId: string | null) => void;
  setDmxOutputBackend: (dmxOutputBackend: DmxOutputBackend) => void;
  setArtNetHost: (artNetHost: string) => void;
  setArtNetPort: (artNetPort: number) => void;
  setEnttecProPortId: (enttecProPortId: string | null) => void;
  ndiOutputEnabled: boolean;
  ndiSourceName: string;
  ndiOutputWidth: number;
  ndiOutputHeight: number;
  ndiOutputFps: number;
  /** One-time hint that the GSC brand opens the file menu. */
  hasSeenFileMenuHint: boolean;
  setNdiOutputEnabled: (enabled: boolean) => void;
  setNdiSourceName: (name: string) => void;
  setNdiOutputWidth: (width: number) => void;
  setNdiOutputHeight: (height: number) => void;
  setNdiOutputFps: (fps: number) => void;
  markFileMenuHintSeen: () => void;
  /** Desktop remote control HTTP/WebSocket port. */
  remotePort: number;
  /** Preferred remote PIN (6 digits). Empty means auto-generate on first start. */
  remotePin: string;
  /** Start remote server automatically on app launch. */
  remoteAutoStart: boolean;
  setRemotePort: (remotePort: number) => void;
  setRemotePin: (remotePin: string) => void;
  setRemoteAutoStart: (remoteAutoStart: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  devtools(
    persist(
      (set) => ({
        locale: "en",
        soundCardId: null,
        midiInterfaceId: null,
        midiInputId: null,
        dmxOutputBackend: "artnet",
        artNetHost: DEFAULT_ART_NET_HOST,
        artNetPort: DEFAULT_ART_NET_PORT,
        enttecProPortId: null,
        ndiOutputEnabled: false,
        ndiSourceName: DEFAULT_NDI_SOURCE_NAME,
        ndiOutputWidth: DEFAULT_NDI_OUTPUT_WIDTH,
        ndiOutputHeight: DEFAULT_NDI_OUTPUT_HEIGHT,
        ndiOutputFps: DEFAULT_NDI_OUTPUT_FPS,
        hasSeenFileMenuHint: false,
        remotePort: 8766,
        remotePin: "",
        remoteAutoStart: false,
        setLocale: (locale) => {
          setAppLocale(locale);
          set({ locale });
        },
        setSoundCardId: (soundCardId) => set({ soundCardId }),
        setMidiInterfaceId: (midiInterfaceId) => set({ midiInterfaceId }),
        setMidiInputId: (midiInputId) => set({ midiInputId }),
        setDmxOutputBackend: (dmxOutputBackend) => set({ dmxOutputBackend }),
        setArtNetHost: (artNetHost) => set({ artNetHost }),
        setArtNetPort: (artNetPort) => set({ artNetPort }),
        setEnttecProPortId: (enttecProPortId) => set({ enttecProPortId }),
        setNdiOutputEnabled: (ndiOutputEnabled) => set({ ndiOutputEnabled }),
        setNdiSourceName: (ndiSourceName) => set({ ndiSourceName }),
        setNdiOutputWidth: (ndiOutputWidth) => set({ ndiOutputWidth }),
        setNdiOutputHeight: (ndiOutputHeight) => set({ ndiOutputHeight }),
        setNdiOutputFps: (ndiOutputFps) => set({ ndiOutputFps }),
        markFileMenuHintSeen: () => set({ hasSeenFileMenuHint: true }),
        setRemotePort: (remotePort) => set({ remotePort }),
        setRemotePin: (remotePin) => set({ remotePin }),
        setRemoteAutoStart: (remoteAutoStart) => set({ remoteAutoStart }),
      }),
      {
        name: "gsc-preferences",
        partialize: (s) => ({
          locale: s.locale,
          soundCardId: s.soundCardId,
          midiInterfaceId: s.midiInterfaceId,
          midiInputId: s.midiInputId,
          dmxOutputBackend: s.dmxOutputBackend,
          artNetHost: s.artNetHost,
          artNetPort: s.artNetPort,
          enttecProPortId: s.enttecProPortId,
          ndiOutputEnabled: s.ndiOutputEnabled,
          ndiSourceName: s.ndiSourceName,
          ndiOutputWidth: s.ndiOutputWidth,
          ndiOutputHeight: s.ndiOutputHeight,
          ndiOutputFps: s.ndiOutputFps,
          hasSeenFileMenuHint: s.hasSeenFileMenuHint,
          remotePort: s.remotePort,
          remotePin: s.remotePin,
          remoteAutoStart: s.remoteAutoStart,
        }),
      },
    ),
    { name: "PreferencesStore" },
  ),
);
