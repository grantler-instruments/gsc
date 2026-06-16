import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { MidiAction } from "../types/midi-mapping";
import type { RightSidebarTabId } from "../types/right-sidebar";
import type { SidebarTabId } from "../types/sidebar";

interface UiState {
  sidebarTab: SidebarTabId;
  rightSidebarTab: RightSidebarTabId;
  darkMode: boolean;
  /** When true, the show is locked for playback — no cue/project edits. */
  showMode: boolean;
  settingsDialogOpen: boolean;
  /** Next incoming MIDI message creates a mapping with this action (learn mode). */
  midiLearnAction: MidiAction | null;
  /** Collapsed parallel/sequence groups in the cue list (session only). */
  collapsedCueGroupIds: string[];
  /** Light cues checked for live DMX preview in the cue list. */
  dmxPreviewCueIds: string[];
  /** When true, the fixture plot is in reposition edit mode. */
  fixturePlotEditMode: boolean;
  /** When true, a larger fixture plot is shown above the cue list. */
  fixturePlotExpanded: boolean;
  /** Compact-layout inspector drawer is open (blocks global Escape → panic). */
  compactInspectorDrawerOpen: boolean;
  /** Compact inspector drawer stays closed until the user selects a cue. */
  compactInspectorDrawerDismissed: boolean;
  /** Asset row under the pointer in the assets panel (session only). */
  hoveredAssetPath: string | null;
  setSidebarTab: (tab: SidebarTabId) => void;
  setRightSidebarTab: (tab: RightSidebarTabId) => void;
  setDarkMode: (dark: boolean) => void;
  setShowMode: (showMode: boolean) => void;
  setSettingsDialogOpen: (open: boolean) => void;
  setMidiLearnAction: (action: MidiAction | null) => void;
  toggleShowMode: () => void;
  toggleCueGroupCollapsed: (groupId: string) => void;
  setFixturePlotEditMode: (open: boolean) => void;
  setFixturePlotExpanded: (expanded: boolean) => void;
  toggleFixturePlotExpanded: () => void;
  setCompactInspectorDrawerOpen: (open: boolean) => void;
  setCompactInspectorDrawerDismissed: (dismissed: boolean) => void;
  setHoveredAssetPath: (path: string | null) => void;
}

export const useUiStore = create<UiState>()(
  devtools(
    persist(
      (set) => ({
        sidebarTab: "assets",
        rightSidebarTab: "cue",
        darkMode: true,
        showMode: false,
        settingsDialogOpen: false,
        midiLearnAction: null,
        collapsedCueGroupIds: [],
        dmxPreviewCueIds: [],
        fixturePlotEditMode: false,
        fixturePlotExpanded: false,
        compactInspectorDrawerOpen: false,
        compactInspectorDrawerDismissed: true,
        hoveredAssetPath: null,
        setSidebarTab: (sidebarTab) => set({ sidebarTab }),
        setRightSidebarTab: (rightSidebarTab) => set({ rightSidebarTab }),
        setDarkMode: (darkMode) => set({ darkMode }),
        setSettingsDialogOpen: (settingsDialogOpen) => set({ settingsDialogOpen }),
        setMidiLearnAction: (midiLearnAction) => set({ midiLearnAction }),
        setShowMode: (showMode) =>
          set({
            showMode,
            ...(showMode
              ? { compactInspectorDrawerDismissed: true, sidebarTab: "cues" as const }
              : {}),
          }),
        toggleShowMode: () =>
          set((s) => {
            const showMode = !s.showMode;
            return {
              showMode,
              ...(showMode
                ? { compactInspectorDrawerDismissed: true, sidebarTab: "cues" as const }
                : {}),
            };
          }),
        toggleCueGroupCollapsed: (groupId) =>
          set((s) => {
            const collapsed = new Set(s.collapsedCueGroupIds);
            if (collapsed.has(groupId)) collapsed.delete(groupId);
            else collapsed.add(groupId);
            return { collapsedCueGroupIds: [...collapsed] };
          }),
        setFixturePlotEditMode: (fixturePlotEditMode) => set({ fixturePlotEditMode }),
        setFixturePlotExpanded: (fixturePlotExpanded) => set({ fixturePlotExpanded }),
        toggleFixturePlotExpanded: () =>
          set((s) => ({ fixturePlotExpanded: !s.fixturePlotExpanded })),
        setCompactInspectorDrawerOpen: (compactInspectorDrawerOpen) =>
          set({ compactInspectorDrawerOpen }),
        setCompactInspectorDrawerDismissed: (compactInspectorDrawerDismissed) =>
          set({ compactInspectorDrawerDismissed }),
        setHoveredAssetPath: (hoveredAssetPath) => set({ hoveredAssetPath }),
      }),
      {
        name: "gsc-ui",
        partialize: (s) => ({
          sidebarTab: s.sidebarTab,
          rightSidebarTab: s.rightSidebarTab,
          darkMode: s.darkMode,
        }),
      },
    ),
    { name: "UiStore" },
  ),
);
