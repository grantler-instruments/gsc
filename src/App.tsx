import Box from "@mui/material/Box";
import { AppSnackbar } from "./components/AppSnackbar";
import { CompactInspectorDrawer } from "./components/CompactInspectorDrawer";
import { CueInspector } from "./components/CueInspector";
import { CueList } from "./components/CueList";
import { DmxPreviewConfirmDialog } from "./components/DmxPreviewConfirmDialog";
import { LeftSidebar } from "./components/LeftSidebar";
import { ProjectToolbar } from "./components/ProjectToolbar";
import { RightSidebar } from "./components/RightSidebar";
import { SettingsDialog } from "./components/SettingsDialog";
import { ProjectLoadingScreen } from "./components/ProjectLoadingScreen";
import { StartupProjectsDialog } from "./components/StartupProjectsDialog";
import { TransportBar } from "./components/TransportBar";
import { UnsavedProjectDialog } from "./components/UnsavedProjectDialog";
import { useAppRuntime } from "./hooks/useAppRuntime";
import { useProjectLoadingStore } from "./stores/project-loading";
import { useCompactLayout } from "./hooks/useCompactLayout";
import { getPrimarySelectedCueId } from "./lib/cue-selection";
import { useActiveCueList, useProjectStore } from "./stores/project";
import { useUiStore } from "./stores/ui";

function App() {
  const sessionReady = useAppRuntime();
  const projectLoading = useProjectLoadingStore((s) => s.active);
  const compact = useCompactLayout();
  const showMode = useUiStore((s) => s.showMode);
  const fixtures = useProjectStore((s) => s.fixtures);
  const selectedCueIds = useActiveCueList().selectedCueIds;
  const hasSelectedCue = getPrimarySelectedCueId(selectedCueIds) !== null;
  const hasFixtures = fixtures.length > 0;

  if (!sessionReady || projectLoading) {
    return (
      <>
        <ProjectLoadingScreen restoring={!sessionReady} />
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
        flex: 1,
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <ProjectToolbar />

      <Box
        sx={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflow: "clip",
        }}
      >
        <LeftSidebar />

        {!compact && (
          <Box
            component="main"
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              minHeight: 0,
              overflow: "clip",
            }}
          >
            <Box sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0, overflow: "clip" }}>
              <CueList />
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
