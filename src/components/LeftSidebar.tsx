import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useTransportStore } from "../stores/transport";
import { useUiStore } from "../stores/ui";
import { SIDEBAR_TABS, SIDEBAR_WIDTH, type SidebarTabId } from "../types/sidebar";
import { ActiveCuesPanel } from "./ActiveCuesPanel";
import { AssetsPanel } from "./AssetsPanel";
import { FixturesPanel } from "./FixturesPanel";

const TAB_ICONS: Record<SidebarTabId, React.ReactNode> = {
  assets: <FolderOutlinedIcon fontSize="small" />,
  fixtures: <LightbulbOutlinedIcon fontSize="small" />,
  active: <PlayArrowIcon fontSize="small" />,
};

const SIDEBAR_TAB_LABEL_KEYS: Record<SidebarTabId, string> = {
  assets: "sidebar.assets",
  fixtures: "sidebar.fixtures",
  active: "sidebar.active",
};

const sidebarShellSx = {
  width: SIDEBAR_WIDTH,
  flexShrink: 0,
  borderRight: 1,
  borderColor: "divider",
  display: "flex",
  flexDirection: "column",
  bgcolor: "background.paper",
  minHeight: 0,
} as const;

export function LeftSidebar() {
  const { t } = useTranslation();
  const showMode = useUiStore((s) => s.showMode);
  const sidebarTab = useUiStore((s) => s.sidebarTab);
  const setSidebarTab = useUiStore((s) => s.setSidebarTab);
  const activeCount = useTransportStore((s) => s.activeCueIds.length);

  if (showMode) {
    return (
      <Box component="aside" sx={sidebarShellSx}>
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
    <Box component="aside" sx={sidebarShellSx}>
      <Tabs
        value={sidebarTab}
        onChange={(_, value: SidebarTabId) => setSidebarTab(value)}
        variant="fullWidth"
        aria-label={t("sidebar.sidebarAria")}
      >
        {SIDEBAR_TABS.map((tabId) => (
          <Tab
            key={tabId}
            value={tabId}
            label={
              <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}>
                {TAB_ICONS[tabId]}
                <span>{t(SIDEBAR_TAB_LABEL_KEYS[tabId])}</span>
                {tabId === "active" && activeCount > 0 && (
                  <Chip label={activeCount} size="small" color="success" />
                )}
              </Stack>
            }
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
        {sidebarTab === "assets" && <AssetsPanel />}
        {sidebarTab === "fixtures" && <FixturesPanel />}
        {sidebarTab === "active" && <ActiveCuesPanel />}
      </Box>
    </Box>
  );
}
