import Box from "@mui/material/Box";
import { useMemo } from "react";
import { getPrimarySelectedCueId } from "../../lib/cue-selection";
import { buildCueTree } from "../../lib/cues";
import { useActiveCueList, useProjectStore } from "../../stores/project";
import { useTransportStore } from "../../stores/transport";
import { useUiStore } from "../../stores/ui";
import { useGscTokens } from "../../theme/useGscTokens";
import { AddCueMenu } from "../AddCueMenu";
import { CueContextMenu } from "../CueContextMenu";
import { CueListTabs } from "../CueListTabs";
import { FixturePlotMonitor } from "../FixturePlotMonitor";
import { CueListBody } from "./CueListBody";
import { CueListTree } from "./CueListTree";
import { CueListActionsProvider } from "./cueListActionsContext";
import { useCueListContextMenu } from "./useCueListContextMenu";
import { useCueListDrop } from "./useCueListDrop";
import { useCueListRename } from "./useCueListRename";
import { useCueListScrollIntoView } from "./useCueListScrollIntoView";
import { useCueListSelection } from "./useCueListSelection";
import { useCueListStopHighlights } from "./useCueListStopHighlights";

export function CueList() {
  const tokens = useGscTokens();
  const showMode = useUiStore((s) => s.showMode);
  const fixturePlotExpanded = useUiStore((s) => s.fixturePlotExpanded);
  const fixtures = useProjectStore((s) => s.fixtures);
  const activeList = useActiveCueList();
  const cues = activeList.cues;
  const canEdit = !showMode;
  const collapsedCueGroupIds = useUiStore((s) => s.collapsedCueGroupIds);
  const collapsedGroups = useMemo(() => new Set(collapsedCueGroupIds), [collapsedCueGroupIds]);
  const activeCueIds = useTransportStore((s) => s.activeCueIds);
  const runningSequence = useTransportStore((s) => s.runningSequence);
  const copySelectedCues = useProjectStore((s) => s.copySelectedCues);
  const duplicateSelectedCues = useProjectStore((s) => s.duplicateSelectedCues);

  const selection = useCueListSelection(cues, collapsedGroups);
  useCueListScrollIntoView(selection.primarySelectedId);
  const rename = useCueListRename(cues);
  const contextMenu = useCueListContextMenu(
    cues,
    canEdit,
    selection.selectedCueIds,
    selection.selectedCueIdSet,
  );
  const stopHighlights = useCueListStopHighlights(cues, selection.primarySelectedId);
  const listDrop = useCueListDrop(canEdit);

  const tree = useMemo(() => buildCueTree(cues), [cues]);

  return (
    <Box
      component="section"
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        borderRight: !showMode && getPrimarySelectedCueId(selection.selectedCueIds) ? 1 : 0,
        borderColor: "divider",
      }}
    >
      {fixturePlotExpanded && fixtures.length > 0 && <FixturePlotMonitor expanded />}

      <CueListTabs />

      <CueListActionsProvider canEdit={canEdit} allCues={cues} runningSequence={runningSequence}>
        <CueListBody
          canEdit={canEdit}
          listDropActive={listDrop.listDropActive}
          tokens={tokens}
          isEmpty={tree.length === 0}
          onListDragOver={listDrop.onListDragOver}
          onListDragLeave={listDrop.onListDragLeave}
          onListDrop={listDrop.onListDrop}
        >
          <CueListTree
            nodes={tree}
            cues={cues}
            collapsedGroups={collapsedGroups}
            activeCueIds={activeCueIds}
            runningSequence={runningSequence}
            selectedCueIdSet={selection.selectedCueIdSet}
            primarySelectedId={selection.primarySelectedId}
            hoveredStopTargetId={stopHighlights.hoveredStopTargetId}
            selectedStopTargetId={stopHighlights.selectedStopTargetId}
            renamingCueId={rename.renamingCueId}
            renameValue={rename.renameValue}
            onHoverChange={stopHighlights.setHoveredCueId}
            onSelect={selection.handleRowSelect}
            onContextMenu={contextMenu.handleRowContextMenu}
            onRenameChange={rename.setRenameValue}
            onRenameCommit={rename.commitRename}
            onRenameCancel={rename.cancelRename}
          />
        </CueListBody>
      </CueListActionsProvider>

      {canEdit && (
        <CueContextMenu
          menu={contextMenu.contextMenu}
          canRename={contextMenu.canRenameFromMenu}
          onClose={() => contextMenu.setContextMenu(null)}
          onCopy={copySelectedCues}
          onDuplicate={duplicateSelectedCues}
          onRename={() => {
            if (contextMenu.contextMenu) {
              rename.startRename(contextMenu.contextMenu.cueId);
            }
          }}
        />
      )}

      {canEdit && (
        <Box
          component="footer"
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1.5,
            py: 1,
            borderTop: 1,
            borderColor: "divider",
            flexShrink: 0,
            bgcolor: "background.default",
          }}
        >
          <AddCueMenu dropUp fullWidth />
        </Box>
      )}
    </Box>
  );
}
