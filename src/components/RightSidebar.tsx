import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useTranslation } from "react-i18next";
import { useUiStore } from "../stores/ui";
import {
  RIGHT_SIDEBAR_TABS,
  RIGHT_SIDEBAR_WIDTH,
  type RightSidebarTabId,
} from "../types/right-sidebar";
import { CueInspectorPanel } from "./cue-inspector/CueInspectorPanel";
import { DmxOutputPanel } from "./DmxOutputPanel";

const TAB_ICONS: Record<RightSidebarTabId, React.ReactNode> = {
  cue: <EditNoteOutlinedIcon fontSize="small" />,
  dmx: <LightbulbOutlinedIcon fontSize="small" />,
};

const RIGHT_SIDEBAR_TAB_LABEL_KEYS: Record<RightSidebarTabId, string> = {
  cue: "sidebar.cue",
  dmx: "sidebar.dmx",
};

const rightSidebarShellSx = {
  width: RIGHT_SIDEBAR_WIDTH,
  flexShrink: 0,
  borderLeft: 1,
  borderColor: "divider",
  display: "flex",
  flexDirection: "column",
  bgcolor: "background.paper",
  minHeight: 0,
} as const;

function normalizeRightSidebarTab(tab: string): RightSidebarTabId {
  return tab === "dmx" ? "dmx" : "cue";
}

export function RightSidebar() {
  const { t } = useTranslation();
  const rightSidebarTab = useUiStore((s) => normalizeRightSidebarTab(s.rightSidebarTab));
  const setRightSidebarTab = useUiStore((s) => s.setRightSidebarTab);

  return (
    <Box component="aside" sx={rightSidebarShellSx}>
      <Tabs
        value={rightSidebarTab}
        onChange={(_, value: RightSidebarTabId) => setRightSidebarTab(value)}
        variant="fullWidth"
        aria-label={t("sidebar.inspector")}
      >
        {RIGHT_SIDEBAR_TABS.map((tab) => (
          <Tab
            key={tab.id}
            value={tab.id}
            label={
              <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}>
                {TAB_ICONS[tab.id]}
                <span>{t(RIGHT_SIDEBAR_TAB_LABEL_KEYS[tab.id])}</span>
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
        {rightSidebarTab === "cue" && <CueInspectorPanel />}
        {rightSidebarTab === "dmx" && <DmxOutputPanel />}
      </Box>
    </Box>
  );
}
