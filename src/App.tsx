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
import { StartupProjectsDialog } from "./components/StartupProjectsDialog";
import { TransportBar } from "./components/TransportBar";
import { UnsavedProjectDialog } from "./components/UnsavedProjectDialog";
import { useAppRuntime } from "./hooks/useAppRuntime";
import { useCompactLayout } from "./hooks/useCompactLayout";
import { getPrimarySelectedCueId } from "./lib/cue-selection";
import { useActiveCueList, useProjectStore } from "./stores/project";
import { useUiStore } from "./stores/ui";

function App() {
  const sessionReady = useAppRuntime();
  const compact = useCompactLayout();
  const showMode = useUiStore((s) => s.showMode);
  const fixtures = useProjectStore((s) => s.fixtures);
  const selectedCueIds = useActiveCueList().selectedCueIds;
  const hasSelectedCue = getPrimarySelectedCueId(selectedCueIds) !== null;
  const hasFixtures = fixtures.length > 0;

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
        minHeight: "100vh",
      }}
    >
      <ProjectToolbar />

      <Box sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0 }}>
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
            }}
          >
            <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
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
