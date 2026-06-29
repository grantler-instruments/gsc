import Box from "@mui/material/Box";
import { useMemo } from "react";
import { useCompactLayout } from "../../hooks/useCompactLayout";
import { cueListScrollRegionSx, cueWorkspaceMainPanelSx } from "../../layout/responsiveLayout";
import { getPrimarySelectedCueId } from "../../lib/cue-selection";
import { buildCueTree } from "../../lib/cues";
import { useFadeStore } from "../../stores/fade";
import { useActiveCueList, useProjectStore } from "../../stores/project";
import { useTransportStore } from "../../stores/transport";
import { useUiStore } from "../../stores/ui";
import { useGscTokens } from "../../theme/useGscTokens";
import type { CueListKind } from "../../types/cue";
import { AddCueMenu } from "../AddCueMenu";
import { CueContextMenu } from "../CueContextMenu";
import { CueListTabs } from "../CueListTabs";
import { FixturePlotMonitor } from "../FixturePlotMonitor";
import { HotCueGrid } from "../hot-cues/HotCueGrid";
import { HotCueVisibilityToggle } from "../hot-cues/HotCueVisibilityToggle";
import { CueListBody } from "./CueListBody";
import { CueListTree } from "./CueListTree";
import { CueListActionsProvider } from "./cueListActionsContext";
import { useCueListContextMenu } from "./useCueListContextMenu";
import { useCueListDrop } from "./useCueListDrop";
import { useCueListRename } from "./useCueListRename";
import { useCueListScrollIntoView } from "./useCueListScrollIntoView";
import { useCueListSelection } from "./useCueListSelection";
import { useCueListTargetHighlights } from "./useCueListTargetHighlights";

interface CueListProps {
  /** Render a specific list instead of the edit-focus list (split panels). */
  listId?: string;
  /** Restrict the tab bar to one kind (split panels). */
  tabsKind?: CueListKind;
}

export function CueList({ listId, tabsKind }: CueListProps = {}) {
  const tokens = useGscTokens();
  const compact = useCompactLayout();
  const showMode = useUiStore((s) => s.showMode);
  const hotCuePanelVisible = useUiStore((s) => s.hotCuePanelVisible);
  const fixturePlotExpanded = useUiStore((s) => s.fixturePlotExpanded);
  const fixtures = useProjectStore((s) => s.fixtures);
  const activeCueListId = useProjectStore((s) => s.activeCueListId);
  const setActiveCueList = useProjectStore((s) => s.setActiveCueList);
  const activeList = useActiveCueList();
  const listById = useProjectStore((s) =>
    listId ? s.cueLists.find((l) => l.id === listId) : undefined,
  );
  const list = listById ?? activeList;
  const cues = list.cues;
  const isHotList = list.kind === "hot";
  const canEdit = !showMode;
  const collapsedCueGroupIds = useUiStore((s) => s.collapsedCueGroupIds);
  const collapsedGroups = useMemo(() => new Set(collapsedCueGroupIds), [collapsedCueGroupIds]);
  const activeCueIds = useTransportStore((s) => s.activeCueIds);
  const runningSequences = useTransportStore((s) => s.runningSequences);
  const dmxFadesByFadeCueId = useFadeStore((s) => s.dmxFadesByFadeCueId);
  const copySelectedCues = useProjectStore((s) => s.copySelectedCues);
  const cutSelectedCues = useProjectStore((s) => s.cutSelectedCues);
  const duplicateSelectedCues = useProjectStore((s) => s.duplicateSelectedCues);
  const ungroupCue = useProjectStore((s) => s.ungroupCue);

  const selection = useCueListSelection(cues, collapsedGroups, listId);
  useCueListScrollIntoView(selection.primarySelectedId);
  const rename = useCueListRename(cues);
  const contextMenu = useCueListContextMenu(
    cues,
    canEdit,
    selection.selectedCueIds,
    selection.selectedCueIdSet,
  );
  const targetHighlights = useCueListTargetHighlights(cues, selection.primarySelectedId);
  const listDrop = useCueListDrop(canEdit, list.id);

  const tree = useMemo(() => buildCueTree(cues), [cues]);
  const listHasEditFocus = activeCueListId === list.id;

  return (
    <Box
      component="section"
      onPointerDownCapture={
        listId && activeCueListId !== listId ? () => setActiveCueList(listId) : undefined
      }
      sx={{
        ...(listId ? cueWorkspaceMainPanelSx : { flex: 1, minHeight: 0, minWidth: 0 }),
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        overflow: "clip",
        borderRight:
          !compact &&
          !showMode &&
          listHasEditFocus &&
          getPrimarySelectedCueId(selection.selectedCueIds) &&
          (!listId || !hotCuePanelVisible)
            ? 1
            : 0,
        borderColor: "divider",
      }}
    >
      {fixturePlotExpanded && fixtures.length > 0 && <FixturePlotMonitor expanded />}

      <CueListTabs
        kind={tabsKind}
        activeListId={listId}
        trailing={listId && tabsKind === "sequence" ? <HotCueVisibilityToggle /> : undefined}
      />

      <CueListActionsProvider
        canEdit={canEdit}
        listId={list.id}
        allCues={cues}
        runningSequences={runningSequences}
        hot={isHotList}
      >
        <Box sx={cueListScrollRegionSx}>
          {isHotList && showMode ? (
            <HotCueGrid listId={list.id} />
          ) : (
            <CueListBody
              listId={list.id}
              canEdit={canEdit}
              listDropActive={listDrop.listDropActive}
              tokens={tokens}
              isEmpty={tree.length === 0}
              onListDragOver={listDrop.onListDragOver}
              onListDragLeave={listDrop.onListDragLeave}
              onListDrop={listDrop.onListDrop}
              onListDropCapture={listDrop.onListDropCapture}
            >
              <CueListTree
                nodes={tree}
                cues={cues}
                canEdit={canEdit}
                collapsedGroups={collapsedGroups}
                activeCueIds={activeCueIds}
                runningSequences={runningSequences}
                dmxFadesByFadeCueId={dmxFadesByFadeCueId}
                selectedCueIdSet={selection.selectedCueIdSet}
                primarySelectedId={selection.primarySelectedId}
                listHasEditFocus={listHasEditFocus}
                hoveredTargetId={targetHighlights.hoveredTargetId}
                selectedTargetId={targetHighlights.selectedTargetId}
                targetHighlightToken={targetHighlights.targetHighlightToken}
                renamingCueId={rename.renamingCueId}
                renameValue={rename.renameValue}
                onHoverChange={targetHighlights.setHoveredCueId}
                onSelect={selection.handleRowSelect}
                onContextMenu={contextMenu.handleRowContextMenu}
                onRenameChange={rename.setRenameValue}
                onRenameCommit={rename.commitRename}
                onRenameCancel={rename.cancelRename}
              />
            </CueListBody>
          )}
        </Box>
      </CueListActionsProvider>

      {canEdit && (
        <CueContextMenu
          menu={contextMenu.contextMenu}
          canRename={contextMenu.canRenameFromMenu}
          canUngroup={contextMenu.canUngroupFromMenu}
          onClose={() => contextMenu.setContextMenu(null)}
          onCopy={copySelectedCues}
          onCut={cutSelectedCues}
          onDuplicate={duplicateSelectedCues}
          onRename={() => {
            if (contextMenu.contextMenu) {
              rename.startRename(contextMenu.contextMenu.cueId);
            }
          }}
          onUngroup={() => {
            if (contextMenu.contextMenu) {
              ungroupCue(contextMenu.contextMenu.cueId);
            }
          }}
        />
      )}

      {canEdit && !isHotList && (
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
