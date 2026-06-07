import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useCompactLayout } from "../hooks/useCompactLayout";
import {
  compactSidebarShellSx,
  compactSidebarTabLabelSx,
  sidebarTabsSx,
} from "../layout/responsiveLayout";
import { useTransportStore } from "../stores/transport";
import { useUiStore } from "../stores/ui";
import { normalizeSidebarTab, type SidebarTabId, sidebarTabsForLayout } from "../types/sidebar";
import { ActiveCuesPanel } from "./ActiveCuesPanel";
import { AssetsPanel } from "./AssetsPanel";
import { CueList } from "./CueList";
import { FixturesPanel } from "./FixturesPanel";

const TAB_ICONS: Record<SidebarTabId, React.ReactNode> = {
  cues: <ListAltOutlinedIcon fontSize="small" />,
  assets: <FolderOutlinedIcon fontSize="small" />,
  fixtures: <LightbulbOutlinedIcon fontSize="small" />,
  active: <PlayArrowIcon fontSize="small" />,
};

const SIDEBAR_TAB_LABEL_KEYS: Record<SidebarTabId, string> = {
  cues: "sidebar.cues",
  assets: "sidebar.assets",
  fixtures: "sidebar.fixtures",
  active: "sidebar.active",
};

function SidebarTabPanel({ sidebarTab, compact }: { sidebarTab: SidebarTabId; compact: boolean }) {
  return (
    <>
      {sidebarTab === "cues" && compact && <CueList />}
      {sidebarTab === "assets" && <AssetsPanel />}
      {sidebarTab === "fixtures" && <FixturesPanel />}
      {sidebarTab === "active" && <ActiveCuesPanel />}
    </>
  );
}

export function LeftSidebar() {
  const { t } = useTranslation();
  const compact = useCompactLayout();
  const showMode = useUiStore((s) => s.showMode);
  const sidebarTab = useUiStore((s) => s.sidebarTab);
  const setSidebarTab = useUiStore((s) => s.setSidebarTab);
  const activeCount = useTransportStore((s) => s.activeCueIds.length);
  const tabs = sidebarTabsForLayout(compact, showMode);
  const normalizedTab = normalizeSidebarTab(sidebarTab, compact, showMode);
  const wasCompact = useRef<boolean | null>(null);

  useEffect(() => {
    if (compact && wasCompact.current !== true) {
      setSidebarTab("cues");
    }
    wasCompact.current = compact;
  }, [compact, setSidebarTab]);

  useEffect(() => {
    if (normalizedTab !== sidebarTab) {
      setSidebarTab(normalizedTab);
    }
  }, [normalizedTab, sidebarTab, setSidebarTab]);

  if (showMode && !compact) {
    return (
      <Box component="aside" sx={compactSidebarShellSx}>
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 1.25,
            borderBottom: 1,
            borderColor: "divider",
            flexShrink: 0,
          }}
        >
          <PlayArrowIcon fontSize="small" aria-hidden />
          <Typography variant="subtitle2" sx={{ flex: 1, m: 0 }}>
            {t("sidebar.activeCues")}
          </Typography>
          {activeCount > 0 && <Chip label={activeCount} size="small" color="success" />}
        </Stack>
        <Box
          role="region"
          aria-label={t("sidebar.activeCues")}
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <ActiveCuesPanel />
        </Box>
      </Box>
    );
  }

  return (
    <Box component="aside" sx={compactSidebarShellSx}>
      <Tabs
        value={normalizedTab}
        onChange={(_, value: SidebarTabId) => setSidebarTab(value)}
        variant={compact ? "scrollable" : "fullWidth"}
        scrollButtons={compact ? "auto" : false}
        allowScrollButtonsMobile={compact}
        aria-label={t("sidebar.sidebarAria")}
        sx={sidebarTabsSx(compact)}
      >
        {tabs.map((tabId) => (
          <Tab
            key={tabId}
            value={tabId}
            label={
              <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}>
                {TAB_ICONS[tabId]}
                <Box component="span" sx={compactSidebarTabLabelSx}>
                  {t(SIDEBAR_TAB_LABEL_KEYS[tabId])}
                </Box>
                {tabId === "active" && activeCount > 0 && (
                  <Chip label={activeCount} size="small" color="success" />
                )}
              </Stack>
            }
            aria-label={t(SIDEBAR_TAB_LABEL_KEYS[tabId])}
            sx={{ minHeight: 40 }}
          />
        ))}
      </Tabs>

      <Box
        role="tabpanel"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <SidebarTabPanel sidebarTab={normalizedTab} compact={compact} />
      </Box>
    </Box>
  );
}
