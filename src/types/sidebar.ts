export type SidebarTabId = "assets" | "active";

export interface SidebarTab {
  id: SidebarTabId;
  label: string;
}

export const SIDEBAR_TABS: SidebarTab[] = [
  { id: "assets", label: "Assets" },
  { id: "active", label: "Active" },
];
