import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface PreferencesState {
  /** Tauri: selected audio output device id (device name from cpal). */
  soundCardId: string | null;
  /** Web MIDI output id or Tauri MIDI port index (output). */
  midiInterfaceId: string | null;
  /** Web MIDI input id or Tauri MIDI port index (input). */
  midiInputId: string | null;
  setSoundCardId: (soundCardId: string | null) => void;
  setMidiInterfaceId: (midiInterfaceId: string | null) => void;
  setMidiInputId: (midiInputId: string | null) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  devtools(
    persist(
      (set) => ({
        soundCardId: null,
        midiInterfaceId: null,
        midiInputId: null,
        setSoundCardId: (soundCardId) => set({ soundCardId }),
        setMidiInterfaceId: (midiInterfaceId) => set({ midiInterfaceId }),
        setMidiInputId: (midiInputId) => set({ midiInputId }),
      }),
      {
        name: "gsc-preferences",
        partialize: (s) => ({
          soundCardId: s.soundCardId,
          midiInterfaceId: s.midiInterfaceId,
          midiInputId: s.midiInputId,
        }),
      },
    ),
    { name: "PreferencesStore" },
  ),
);
