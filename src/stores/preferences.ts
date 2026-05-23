import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { DEFAULT_ART_NET_HOST, DEFAULT_ART_NET_PORT } from "../lib/dmx";
import { getPlatform, type PlatformKind } from "../platform";

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
  setSoundCardId: (soundCardId: string | null) => void;
  setMidiInterfaceId: (midiInterfaceId: string | null) => void;
  setMidiInputId: (midiInputId: string | null) => void;
  setDmxOutputBackend: (dmxOutputBackend: DmxOutputBackend) => void;
  setArtNetHost: (artNetHost: string) => void;
  setArtNetPort: (artNetPort: number) => void;
  setEnttecProPortId: (enttecProPortId: string | null) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  devtools(
    persist(
      (set) => ({
        soundCardId: null,
        midiInterfaceId: null,
        midiInputId: null,
        dmxOutputBackend: "artnet",
        artNetHost: DEFAULT_ART_NET_HOST,
        artNetPort: DEFAULT_ART_NET_PORT,
        enttecProPortId: null,
        setSoundCardId: (soundCardId) => set({ soundCardId }),
        setMidiInterfaceId: (midiInterfaceId) => set({ midiInterfaceId }),
        setMidiInputId: (midiInputId) => set({ midiInputId }),
        setDmxOutputBackend: (dmxOutputBackend) => set({ dmxOutputBackend }),
        setArtNetHost: (artNetHost) => set({ artNetHost }),
        setArtNetPort: (artNetPort) => set({ artNetPort }),
        setEnttecProPortId: (enttecProPortId) => set({ enttecProPortId }),
      }),
      {
        name: "gsc-preferences",
        partialize: (s) => ({
          soundCardId: s.soundCardId,
          midiInterfaceId: s.midiInterfaceId,
          midiInputId: s.midiInputId,
          dmxOutputBackend: s.dmxOutputBackend,
          artNetHost: s.artNetHost,
          artNetPort: s.artNetPort,
          enttecProPortId: s.enttecProPortId,
        }),
      },
    ),
    { name: "PreferencesStore" },
  ),
);
