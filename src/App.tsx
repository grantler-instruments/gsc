import Box from "@mui/material/Box";
import { CueInspector } from "./components/CueInspector";
import { CueList } from "./components/CueList";
import { LeftSidebar } from "./components/LeftSidebar";
import { ProjectToolbar } from "./components/ProjectToolbar";
import { SettingsDialog } from "./components/SettingsDialog";
import { TransportBar } from "./components/TransportBar";
import { useAppRuntime } from "./hooks/useAppRuntime";
import { getPrimarySelectedCueId } from "./lib/cue-selection";
import { AppSnackbar } from "./components/AppSnackbar";
import { useActiveCueList } from "./stores/project";
import { useUiStore } from "./stores/ui";

function App() {
  const sessionReady = useAppRuntime();
  const showMode = useUiStore((s) => s.showMode);
  const selectedCueIds = useActiveCueList().selectedCueIds;
  const hasSelectedCue =
    !showMode && getPrimarySelectedCueId(selectedCueIds) !== null;

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
            {hasSelectedCue && <CueInspector />}
          </Box>
        </Box>
      </Box>

      <TransportBar />
      <SettingsDialog />
      <AppSnackbar />
    </Box>
  );
}

export default App;
