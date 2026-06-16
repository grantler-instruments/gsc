import type { MouseEvent } from "react";
import { cueMissingAsset, cueUsesAsset } from "../../lib/cue-asset";
import { type CueListNode, getChildCues, isContainerCue, isCueActive } from "../../lib/cues";
import type { RunningSequence } from "../../stores/transport";
import { useUiStore } from "../../stores/ui";
import { useVfsStore } from "../../stores/vfs";
import type { Cue } from "../../types/cue";
import { CueContainerLeadingDrop } from "./CueContainerLeadingDrop";
import { CueContainerTrailingDrop } from "./CueContainerTrailingDrop";
import { CueRow } from "./CueRow";
import { useCueDragActive } from "./useCueDragActive";

export interface CueListTreeProps {
  nodes: CueListNode[];
  cues: Cue[];
  canEdit: boolean;
  collapsedGroups: Set<string>;
  activeCueIds: string[];
  runningSequence: RunningSequence | null;
  dmxFadesByFadeCueId: Readonly<Record<string, unknown>>;
  selectedCueIdSet: Set<string>;
  primarySelectedId: string | null;
  hoveredTargetId: string | null;
  selectedTargetId: string | null;
  targetHighlightToken: string;
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
  canEdit,
  collapsedGroups,
  activeCueIds,
  runningSequence,
  dmxFadesByFadeCueId,
  selectedCueIdSet,
  primarySelectedId,
  hoveredTargetId,
  selectedTargetId,
  targetHighlightToken,
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
  const hoveredAssetPath = useUiStore((s) => s.hoveredAssetPath);
  const cueDragging = useCueDragActive();

  return nodes.flatMap((node) => {
    const expanded = !collapsedGroups.has(node.cue.id);
    const childCount = isContainerCue(node.cue) ? getChildCues(cues, node.cue.id).length : 0;

    const highlightAsTarget =
      node.cue.id === hoveredTargetId ||
      node.cue.id === selectedTargetId ||
      cueUsesAsset(node.cue, hoveredAssetPath);

    const row = (
      <CueRow
        key={node.cue.id}
        cue={node.cue}
        depth={node.depth}
        childCount={childCount}
        expanded={expanded}
        selected={selectedCueIdSet.has(node.cue.id)}
        primarySelected={node.cue.id === primarySelectedId}
        active={isCueActive(node.cue, cues, activeCueIds, runningSequence, dmxFadesByFadeCueId)}
        missingAsset={cueMissingAsset(node.cue, assetEntries)}
        highlightAsTarget={highlightAsTarget}
        targetHighlightToken={targetHighlightToken}
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

    if (isContainerCue(node.cue) && expanded) {
      return [
        row,
        ...(canEdit && cueDragging && node.children.length > 0
          ? [
              <CueContainerLeadingDrop
                key={`${node.cue.id}-leading`}
                canEdit={canEdit}
                containerId={node.cue.id}
                firstChildId={node.children[0].cue.id}
                depth={node.depth + 1}
              />,
            ]
          : []),
        ...(node.children.length > 0
          ? [
              <CueListTree
                key={`${node.cue.id}-children`}
                nodes={node.children}
                cues={cues}
                canEdit={canEdit}
                collapsedGroups={collapsedGroups}
                activeCueIds={activeCueIds}
                runningSequence={runningSequence}
                dmxFadesByFadeCueId={dmxFadesByFadeCueId}
                selectedCueIdSet={selectedCueIdSet}
                primarySelectedId={primarySelectedId}
                hoveredTargetId={hoveredTargetId}
                selectedTargetId={selectedTargetId}
                targetHighlightToken={targetHighlightToken}
                renamingCueId={renamingCueId}
                renameValue={renameValue}
                onHoverChange={onHoverChange}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
                onRenameChange={onRenameChange}
                onRenameCommit={onRenameCommit}
                onRenameCancel={onRenameCancel}
              />,
            ]
          : []),
        ...(canEdit && cueDragging
          ? [
              <CueContainerTrailingDrop
                key={`${node.cue.id}-children-trailing`}
                canEdit={canEdit}
                containerId={node.cue.id}
                depth={node.depth + 1}
                mode="children-end"
              />,
              <CueContainerTrailingDrop
                key={`${node.cue.id}-exit-trailing`}
                canEdit={canEdit}
                containerId={node.cue.id}
                depth={node.depth}
                mode="exit"
              />,
            ]
          : []),
      ];
    }

    return [row];
  });
}
