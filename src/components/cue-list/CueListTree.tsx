import type { MouseEvent } from "react";
import { cueMissingAsset } from "../../lib/cue-asset";
import { type CueListNode, getChildCues, isContainerCue, isCueActive } from "../../lib/cues";
import type { RunningSequence } from "../../stores/transport";
import { useVfsStore } from "../../stores/vfs";
import type { Cue } from "../../types/cue";
import { CueRow } from "./CueRow";

export interface CueListTreeProps {
  nodes: CueListNode[];
  cues: Cue[];
  collapsedGroups: Set<string>;
  activeCueIds: string[];
  runningSequence: RunningSequence | null;
  selectedCueIdSet: Set<string>;
  primarySelectedId: string | null;
  hoveredStopTargetId: string | null;
  selectedStopTargetId: string | null;
  renamingCueId: string | null;
  renameValue: string;
  onHoverChange: (cueId: string | null) => void;
  onSelect: (cueId: string, e: MouseEvent) => void;
  onContextMenu: (cueId: string, e: MouseEvent) => void;
  onRenameChange: (value: string) => void;
  onRenameCommit: (cueId: string) => void;
  onRenameCancel: () => void;
}

export function CueListTree({
  nodes,
  cues,
  collapsedGroups,
  activeCueIds,
  runningSequence,
  selectedCueIdSet,
  primarySelectedId,
  hoveredStopTargetId,
  selectedStopTargetId,
  renamingCueId,
  renameValue,
  onHoverChange,
  onSelect,
  onContextMenu,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
}: CueListTreeProps) {
  const assetEntries = useVfsStore((s) => s.entries);

  return nodes.flatMap((node) => {
    const expanded = !collapsedGroups.has(node.cue.id);
    const childCount = isContainerCue(node.cue) ? getChildCues(cues, node.cue.id).length : 0;

    const row = (
      <CueRow
        key={node.cue.id}
        cue={node.cue}
        depth={node.depth}
        childCount={childCount}
        expanded={expanded}
        selected={selectedCueIdSet.has(node.cue.id)}
        primarySelected={node.cue.id === primarySelectedId}
        active={isCueActive(node.cue, cues, activeCueIds, runningSequence)}
        missingAsset={cueMissingAsset(node.cue, assetEntries)}
        pulseAsStopTarget={node.cue.id === hoveredStopTargetId}
        staticAsStopTarget={node.cue.id === selectedStopTargetId}
        onHoverChange={onHoverChange}
        onSelect={(e) => onSelect(node.cue.id, e)}
        onContextMenu={(e) => onContextMenu(node.cue.id, e)}
        isRenaming={renamingCueId === node.cue.id}
        renameValue={renameValue}
        onRenameChange={onRenameChange}
        onRenameCommit={() => onRenameCommit(node.cue.id)}
        onRenameCancel={onRenameCancel}
      />
    );

    if (isContainerCue(node.cue) && expanded && node.children.length > 0) {
      return [
        row,
        <CueListTree
          key={`${node.cue.id}-children`}
          nodes={node.children}
          cues={cues}
          collapsedGroups={collapsedGroups}
          activeCueIds={activeCueIds}
          runningSequence={runningSequence}
          selectedCueIdSet={selectedCueIdSet}
          primarySelectedId={primarySelectedId}
          hoveredStopTargetId={hoveredStopTargetId}
          selectedStopTargetId={selectedStopTargetId}
          renamingCueId={renamingCueId}
          renameValue={renameValue}
          onHoverChange={onHoverChange}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onRenameChange={onRenameChange}
          onRenameCommit={onRenameCommit}
          onRenameCancel={onRenameCancel}
        />,
      ];
    }

    return [row];
  });
}
