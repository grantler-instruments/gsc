import Box from "@mui/material/Box";
import { AppSnackbar } from "./components/AppSnackbar";
import { AudioMixerDock } from "./components/AudioMixerDock";
import { CompactInspectorDrawer } from "./components/CompactInspectorDrawer";
import { CueInspector } from "./components/CueInspector";
import { CueList } from "./components/CueList";
import { DeleteAssetInUseDialog } from "./components/DeleteAssetInUseDialog";
import { DeleteStoredProjectDialog } from "./components/DeleteStoredProjectDialog";
import { DiscardDraftDialog } from "./components/DiscardDraftDialog";
import { DmxPreviewConfirmDialog } from "./components/DmxPreviewConfirmDialog";
import { DraftProjectBanner } from "./components/DraftProjectBanner";
import { HotCuePanel } from "./components/hot-cues/HotCuePanel";
import { LeftSidebar } from "./components/LeftSidebar";
import { ProjectLoadingScreen } from "./components/ProjectLoadingScreen";
import { ProjectToolbar } from "./components/ProjectToolbar";
import { Qlab5ImportConfirmDialogHost } from "./components/Qlab5ImportConfirmDialogHost";
import { Qlab5ImportReportDialogHost } from "./components/Qlab5ImportReportDialogHost";
import { RightSidebar } from "./components/RightSidebar";
import { SaveProjectPromptDialog } from "./components/SaveProjectPromptDialog";
import { SettingsDialog } from "./components/SettingsDialog";
import { StartupProjectsDialog } from "./components/StartupProjectsDialog";
import { TransportBar } from "./components/TransportBar";
import { TriggerNoteToasts } from "./components/TriggerNoteToasts";
import { UnsavedProjectDialog } from "./components/UnsavedProjectDialog";
import { WebOpenProjectsDialog } from "./components/WebOpenProjectsDialog";
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
import { useProjectLoadingStore } from "./stores/project-loading";
import { useStartupProjectsPromptStore } from "./stores/startup-projects-prompt";
import { useUiStore } from "./stores/ui";

function App() {
  const sessionReady = useAppRuntime();
  const projectLoading = useProjectLoadingStore((s) => s.active);
  const startupDialogOpen = useStartupProjectsPromptStore((s) => s.open);
  const showProjectLoading = (!sessionReady || projectLoading) && !startupDialogOpen;
  const compact = useCompactLayout();
  const showMode = useUiStore((s) => s.showMode);
  const hotCuePanelOrientation = useUiStore((s) => s.hotCuePanelOrientation);
  const hotCuePanelVisible = useUiStore((s) => s.hotCuePanelVisible);
  const audioMixerOpen = useUiStore((s) => s.audioMixerOpen);
  const fixtures = useProjectStore((s) => s.fixtures);
  const selectedCueIds = useActiveCueList().selectedCueIds;
  const mainSequenceList = useMainSequenceList();
  const hotList = useActiveHotCueList();
  const hasSelectedCue = getPrimarySelectedCueId(selectedCueIds) !== null;
  const hasFixtures = fixtures.length > 0;
  const showHotPanel = hotCuePanelVisible && (showMode ? hotList !== null : true);

  if (!sessionReady || projectLoading) {
    return (
      <>
        {showProjectLoading && <ProjectLoadingScreen restoring={!sessionReady} />}
        <StartupProjectsDialog />
        <WebOpenProjectsDialog />
        <DeleteStoredProjectDialog />
        <UnsavedProjectDialog />
        <SaveProjectPromptDialog />
        <DiscardDraftDialog />
        <Qlab5ImportConfirmDialogHost />
        <Qlab5ImportReportDialogHost />
        <AppSnackbar />
        <TriggerNoteToasts />
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
      <DraftProjectBanner />

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
              ...cueWorkspaceShellSx,
              flexDirection: "column",
              borderLeft: panelEdgeBorder,
              minWidth: 0,
              minHeight: 0,
              overflow: "clip",
            }}
          >
            <Box sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0, overflow: "clip" }}>
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

      <Box sx={{ flexShrink: 0, minWidth: 0 }}>
        {audioMixerOpen && <AudioMixerDock />}
        <TransportBar />
      </Box>
      {compact && <CompactInspectorDrawer />}
      <SettingsDialog />
      <DmxPreviewConfirmDialog />
      <UnsavedProjectDialog />
      <SaveProjectPromptDialog />
      <DiscardDraftDialog />
      <StartupProjectsDialog />
      <WebOpenProjectsDialog />
      <DeleteStoredProjectDialog />
      <DeleteAssetInUseDialog />
      <Qlab5ImportConfirmDialogHost />
      <Qlab5ImportReportDialogHost />
      <AppSnackbar />
      <TriggerNoteToasts />
    </Box>
  );
}

export default App;
