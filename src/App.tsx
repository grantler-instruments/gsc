import Box from "@mui/material/Box";
import { CueInspector } from "./components/CueInspector";
import { CueList } from "./components/CueList";
import { LeftSidebar } from "./components/LeftSidebar";
import { ProjectToolbar } from "./components/ProjectToolbar";
import { TransportBar } from "./components/TransportBar";
import { useAppKeyboard } from "./hooks/useAppKeyboard";
import { useAudioEngine } from "./hooks/useAudioEngine";
import { useSequenceFadeBridge } from "./hooks/useSequenceFadeBridge";
import { useFadeAnimation } from "./hooks/useFadeAnimation";
import { useOutputPublisher } from "./hooks/useOutputPublisher";
import { usePlaybackProgress } from "./hooks/usePlaybackProgress";
import { usePreventBrowserFileDrop } from "./hooks/usePreventBrowserFileDrop";
import { useUiStore } from "./stores/ui";

function App() {
  useAppKeyboard();
  useAudioEngine();
  useFadeAnimation();
  useSequenceFadeBridge();
  useOutputPublisher();
  usePlaybackProgress();
  usePreventBrowserFileDrop();
  const showMode = useUiStore((s) => s.showMode);

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
          <Box
            sx={{
              display: "flex",
              flex: 1,
              minHeight: 0,
              "& .cue-list-panel": showMode
                ? { borderRight: "none" }
                : { borderRight: 1, borderColor: "divider" },
            }}
          >
            <CueList />
            {!showMode && <CueInspector />}
          </Box>
        </Box>
      </Box>

      <TransportBar />
    </Box>
  );
}

export default App;
