import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { SidebarTabId } from "../types/sidebar";

interface UiState {
  sidebarTab: SidebarTabId;
  darkMode: boolean;
  /** When true, the show is locked for playback — no cue/project edits. */
  showMode: boolean;
  /** Collapsed parallel/sequence groups in the cue list (session only). */
  collapsedCueGroupIds: string[];
  setSidebarTab: (tab: SidebarTabId) => void;
  setDarkMode: (dark: boolean) => void;
  setShowMode: (showMode: boolean) => void;
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
        collapsedCueGroupIds: [],
        setSidebarTab: (sidebarTab) => set({ sidebarTab }),
        setDarkMode: (darkMode) => set({ darkMode }),
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
