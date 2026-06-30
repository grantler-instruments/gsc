import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { clampAudioMixerHeight, DEFAULT_AUDIO_MIXER_HEIGHT } from "../lib/audio-mixer-layout";
import {
  clampVideoOutputDockHeight,
  DEFAULT_VIDEO_OUTPUT_DOCK_HEIGHT,
} from "../lib/video-output-layout";
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
  /** Audio mixer dock above the transport bar. */
  audioMixerOpen: boolean;
  /** Height of the audio mixer dock in pixels. */
  audioMixerHeight: number;
  /** Video output dock above the transport bar. */
  videoOutputOpen: boolean;
  /** Height of the video output dock in pixels. */
  videoOutputHeight: number;
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
  setAudioMixerOpen: (open: boolean) => void;
  setAudioMixerHeight: (height: number) => void;
  toggleAudioMixer: () => void;
  setVideoOutputOpen: (open: boolean) => void;
  setVideoOutputHeight: (height: number) => void;
  toggleVideoOutput: () => void;
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
        audioMixerOpen: false,
        audioMixerHeight: DEFAULT_AUDIO_MIXER_HEIGHT,
        videoOutputOpen: false,
        videoOutputHeight: DEFAULT_VIDEO_OUTPUT_DOCK_HEIGHT,
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
        setAudioMixerOpen: (audioMixerOpen) => set({ audioMixerOpen }),
        setAudioMixerHeight: (audioMixerHeight) =>
          set({ audioMixerHeight: clampAudioMixerHeight(audioMixerHeight) }),
        toggleAudioMixer: () => set((s) => ({ audioMixerOpen: !s.audioMixerOpen })),
        setVideoOutputOpen: (videoOutputOpen) => set({ videoOutputOpen }),
        setVideoOutputHeight: (videoOutputHeight) =>
          set({ videoOutputHeight: clampVideoOutputDockHeight(videoOutputHeight) }),
        toggleVideoOutput: () => set((s) => ({ videoOutputOpen: !s.videoOutputOpen })),
      }),
      {
        name: "gsc-ui",
        partialize: (s) => ({
          sidebarTab: s.sidebarTab,
          rightSidebarTab: s.rightSidebarTab,
          darkMode: s.darkMode,
          audioMixerHeight: s.audioMixerHeight,
          videoOutputHeight: s.videoOutputHeight,
        }),
        merge: (persisted, current) => {
          const saved = persisted as Partial<UiState> | undefined;
          return {
            ...current,
            ...saved,
            audioMixerHeight: clampAudioMixerHeight(
              saved?.audioMixerHeight ?? current.audioMixerHeight,
            ),
            videoOutputHeight: clampVideoOutputDockHeight(
              saved?.videoOutputHeight ?? current.videoOutputHeight,
            ),
          };
        },
      },
    ),
    { name: "UiStore" },
  ),
);
