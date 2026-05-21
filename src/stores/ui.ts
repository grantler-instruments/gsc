import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { SidebarTabId } from "../types/sidebar";
import type { MidiAction } from "../types/midi-mapping";

interface UiState {
  sidebarTab: SidebarTabId;
  darkMode: boolean;
  /** When true, the show is locked for playback — no cue/project edits. */
  showMode: boolean;
  settingsDialogOpen: boolean;
  /** Next incoming MIDI message creates a mapping with this action (learn mode). */
  midiLearnAction: MidiAction | null;
  /** Collapsed parallel/sequence groups in the cue list (session only). */
  collapsedCueGroupIds: string[];
  setSidebarTab: (tab: SidebarTabId) => void;
  setDarkMode: (dark: boolean) => void;
  setShowMode: (showMode: boolean) => void;
  setSettingsDialogOpen: (open: boolean) => void;
  setMidiLearnAction: (action: MidiAction | null) => void;
  toggleShowMode: () => void;
  toggleCueGroupCollapsed: (groupId: string) => void;
}

export const useUiStore = create<UiState>()(
  devtools(
    persist(
      (set) => ({
        sidebarTab: "assets",
        darkMode: true,
        showMode: false,
        settingsDialogOpen: false,
        midiLearnAction: null,
        collapsedCueGroupIds: [],
        setSidebarTab: (sidebarTab) => set({ sidebarTab }),
        setDarkMode: (darkMode) => set({ darkMode }),
        setSettingsDialogOpen: (settingsDialogOpen) => set({ settingsDialogOpen }),
        setMidiLearnAction: (midiLearnAction) => set({ midiLearnAction }),
        setShowMode: (showMode) =>
          set({
            showMode,
            ...(showMode ? { sidebarTab: "active" as const } : {}),
          }),
        toggleShowMode: () =>
          set((s) => {
            const showMode = !s.showMode;
            return {
              showMode,
              ...(showMode ? { sidebarTab: "active" as const } : {}),
            };
          }),
        toggleCueGroupCollapsed: (groupId) =>
          set((s) => {
            const collapsed = new Set(s.collapsedCueGroupIds);
            if (collapsed.has(groupId)) collapsed.delete(groupId);
            else collapsed.add(groupId);
            return { collapsedCueGroupIds: [...collapsed] };
          }),
      }),
      {
        name: "gsc-ui",
        partialize: (s) => ({
          sidebarTab: s.sidebarTab,
          darkMode: s.darkMode,
        }),
      },
    ),
    { name: "UiStore" },
  ),
);
