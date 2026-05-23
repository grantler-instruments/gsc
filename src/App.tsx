import Box from "@mui/material/Box";
import { AppSnackbar } from "./components/AppSnackbar";
import { CueInspector } from "./components/CueInspector";
import { CueList } from "./components/CueList";
import { DmxPreviewConfirmDialog } from "./components/DmxPreviewConfirmDialog";
import { LeftSidebar } from "./components/LeftSidebar";
import { ProjectToolbar } from "./components/ProjectToolbar";
import { RightSidebar } from "./components/RightSidebar";
import { SettingsDialog } from "./components/SettingsDialog";
import { TransportBar } from "./components/TransportBar";
import { useAppRuntime } from "./hooks/useAppRuntime";
import { getPrimarySelectedCueId } from "./lib/cue-selection";
import { useActiveCueList, useProjectStore } from "./stores/project";
import { useUiStore } from "./stores/ui";

function App() {
  const sessionReady = useAppRuntime();
  const showMode = useUiStore((s) => s.showMode);
  const fixtures = useProjectStore((s) => s.fixtures);
  const selectedCueIds = useActiveCueList().selectedCueIds;
  const hasSelectedCue = getPrimarySelectedCueId(selectedCueIds) !== null;
  const hasFixtures = fixtures.length > 0;

  if (!sessionReady) {
    return null;
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

      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        <LeftSidebar />

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
      </Box>

      <TransportBar />
      <SettingsDialog />
      <DmxPreviewConfirmDialog />
      <AppSnackbar />
    </Box>
  );
}

export default App;
