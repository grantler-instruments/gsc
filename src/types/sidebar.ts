export type SidebarTabId = "assets" | "fixtures" | "active";

export const SIDEBAR_WIDTH = 280;

export interface SidebarTab {
  id: SidebarTabId;
  label: string;
}

export const SIDEBAR_TABS: SidebarTab[] = [
  { id: "assets", label: "Assets" },
  { id: "fixtures", label: "Fixtures" },
  { id: "active", label: "Active" },
];
