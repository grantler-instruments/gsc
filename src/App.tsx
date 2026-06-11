import Box from "@mui/material/Box";
import { AppSnackbar } from "./components/AppSnackbar";
import { CompactInspectorDrawer } from "./components/CompactInspectorDrawer";
import { CueInspector } from "./components/CueInspector";
import { CueList } from "./components/CueList";
import { DmxPreviewConfirmDialog } from "./components/DmxPreviewConfirmDialog";
import { HotCuePanel } from "./components/hot-cues/HotCuePanel";
import { LeftSidebar } from "./components/LeftSidebar";
import { ProjectToolbar } from "./components/ProjectToolbar";
import { RightSidebar } from "./components/RightSidebar";
import { SettingsDialog } from "./components/SettingsDialog";
import { StartupProjectsDialog } from "./components/StartupProjectsDialog";
import { TransportBar } from "./components/TransportBar";
import { UnsavedProjectDialog } from "./components/UnsavedProjectDialog";
import { useAppRuntime } from "./hooks/useAppRuntime";
import { useCompactLayout } from "./hooks/useCompactLayout";
import {
  cueWorkspaceShellSx,
  cueWorkspaceSplitSx,
  panelEdgeBorder,
} from "./layout/responsiveLayout";
import { getPrimarySelectedCueId } from "./lib/cue-selection";
import {
  useActiveCueList,
  useActiveHotCueList,
  useMainSequenceList,
  useProjectStore,
} from "./stores/project";
import { useUiStore } from "./stores/ui";

function App() {
  const sessionReady = useAppRuntime();
  const compact = useCompactLayout();
  const showMode = useUiStore((s) => s.showMode);
  const hotCuePanelOrientation = useUiStore((s) => s.hotCuePanelOrientation);
  const hotCuePanelVisible = useUiStore((s) => s.hotCuePanelVisible);
  const fixtures = useProjectStore((s) => s.fixtures);
  const selectedCueIds = useActiveCueList().selectedCueIds;
  const mainSequenceList = useMainSequenceList();
  const hotList = useActiveHotCueList();
  const hasSelectedCue = getPrimarySelectedCueId(selectedCueIds) !== null;
  const hasFixtures = fixtures.length > 0;
  const showHotPanel = hotCuePanelVisible && (showMode ? hotList !== null : true);

  if (!sessionReady) {
    return (
      <>
        <StartupProjectsDialog />
        <UnsavedProjectDialog />
      </>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <ProjectToolbar />

      <Box sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden" }}>
        <LeftSidebar />

        {!compact && (
          <Box
            component="main"
            sx={{
              ...cueWorkspaceShellSx,
              flexDirection: "column",
              borderLeft: panelEdgeBorder,
            }}
          >
            <Box sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden" }}>
              <Box sx={cueWorkspaceSplitSx(hotCuePanelOrientation)}>
                <CueList listId={mainSequenceList?.id} tabsKind="sequence" />
                {showHotPanel && <HotCuePanel />}
              </Box>
              {!showMode && hasFixtures && <RightSidebar />}
              {!showMode && !hasFixtures && hasSelectedCue && <CueInspector />}
            </Box>
          </Box>
        )}
      </Box>

      <TransportBar />
      {compact && <CompactInspectorDrawer />}
      <SettingsDialog />
      <DmxPreviewConfirmDialog />
      <UnsavedProjectDialog />
      <StartupProjectsDialog />
      <AppSnackbar />
    </Box>
  );
}

export default App;
