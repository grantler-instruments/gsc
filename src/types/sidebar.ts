export type SidebarTabId = "cues" | "assets" | "fixtures" | "active";

export const SIDEBAR_WIDTH = 280;

export const SIDEBAR_TABS: readonly SidebarTabId[] = ["assets", "fixtures", "active"];

export const COMPACT_SIDEBAR_TABS: readonly SidebarTabId[] = [
  "cues",
  "assets",
  "fixtures",
  "active",
];

export const COMPACT_SHOW_MODE_SIDEBAR_TABS: readonly SidebarTabId[] = ["cues", "active"];

export function sidebarTabsForLayout(compact: boolean, showMode: boolean): readonly SidebarTabId[] {
  if (!compact) {
    return SIDEBAR_TABS;
  }
  return showMode ? COMPACT_SHOW_MODE_SIDEBAR_TABS : COMPACT_SIDEBAR_TABS;
}

export function normalizeSidebarTab(
  tab: string,
  compact: boolean,
  showMode: boolean,
): SidebarTabId {
  const tabs = sidebarTabsForLayout(compact, showMode);
  if (tabs.includes(tab as SidebarTabId)) {
    return tab as SidebarTabId;
  }
  if (showMode) {
    if (tab === "cues" || tab === "active") {
      return tab as SidebarTabId;
    }
    return "cues";
  }
  return compact ? "cues" : "assets";
}
