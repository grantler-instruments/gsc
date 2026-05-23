export type RightSidebarTabId = "cue" | "dmx";

export const RIGHT_SIDEBAR_WIDTH = 320;

export interface RightSidebarTab {
  id: RightSidebarTabId;
  label: string;
}

export const RIGHT_SIDEBAR_TABS: RightSidebarTab[] = [
  { id: "cue", label: "Cue" },
  { id: "dmx", label: "DMX" },
];
