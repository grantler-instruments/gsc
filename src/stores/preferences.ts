import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface PreferencesState {
  /** Tauri: selected audio output device id (device name from cpal). */
  soundCardId: string | null;
  /** Web MIDI output id or Tauri MIDI port id. */
  midiInterfaceId: string | null;
  setSoundCardId: (soundCardId: string | null) => void;
  setMidiInterfaceId: (midiInterfaceId: string | null) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  devtools(
    persist(
      (set) => ({
        soundCardId: null,
        midiInterfaceId: null,
        setSoundCardId: (soundCardId) => set({ soundCardId }),
        setMidiInterfaceId: (midiInterfaceId) => set({ midiInterfaceId }),
      }),
      {
        name: "gsc-preferences",
        partialize: (s) => ({
          soundCardId: s.soundCardId,
          midiInterfaceId: s.midiInterfaceId,
        }),
      },
    ),
    { name: "PreferencesStore" },
  ),
);
