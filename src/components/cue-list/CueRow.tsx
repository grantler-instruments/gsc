import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { type MouseEvent, memo } from "react";
import { getCueAssetWarning } from "../../lib/cue-asset";
import {
  getCueDisplayName,
  getFadeTarget,
  getStopTarget,
  isContainerCue,
  isFadeCue,
  isLightFadeCue,
  isParallelGroup,
  isSequenceGroup,
  isStopCue,
} from "../../lib/cues";
import { pointerLeftElement } from "../../lib/dom";
import { setActiveCueDrag, setCueDragData } from "../../lib/drag";
import { isLightFadeReady } from "../../lib/fade";
import { getParallelGroupOrderConflict } from "../../lib/parallel-group-fire";
import { usePlaybackStore } from "../../stores/playback";
import { useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import {
  cueAssetSx,
  cueExpandBtnSx,
  cueNameSx,
  cueNumberSx,
  cueRowSx,
  cueRowWarningIconSx,
} from "../../theme/cueStyles";
import { useGscTokens } from "../../theme/useGscTokens";
import type { Cue } from "../../types/cue";
import { CueNotesIcon } from "../CueNotesIcon";
import { CueTypeBadge } from "../CueTypeIcon";
import { CueRenameInput } from "./CueRenameInput";
import { CueRowActions } from "./CueRowActions";
import { CueRowDetails } from "./CueRowDetails";
import { useCueListActions } from "./cueListActionsContext";
import { useCueRowDrop } from "./useCueRowDrop";

export interface CueRowProps {
  cue: Cue;
  depth: number;
  childCount: number;
  expanded: boolean;
  selected: boolean;
  primarySelected: boolean;
  active: boolean;
  missingAsset: boolean;
  pulseAsStopTarget: boolean;
  staticAsStopTarget: boolean;
  onHoverChange: (cueId: string | null) => void;
  onSelect: (e: MouseEvent) => void;
  onContextMenu: (e: MouseEvent) => void;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (value: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
}

function cueRowPropsAreEqual(prev: CueRowProps, next: CueRowProps): boolean {
  if (prev.isRenaming || next.isRenaming) {
    if (prev.isRenaming !== next.isRenaming) return false;
    if (prev.isRenaming && prev.renameValue !== next.renameValue) return false;
  }

  return (
    prev.cue === next.cue &&
    prev.depth === next.depth &&
    prev.childCount === next.childCount &&
    prev.expanded === next.expanded &&
    prev.selected === next.selected &&
    prev.primarySelected === next.primarySelected &&
    prev.active === next.active &&
    prev.missingAsset === next.missingAsset &&
    prev.pulseAsStopTarget === next.pulseAsStopTarget &&
    prev.staticAsStopTarget === next.staticAsStopTarget
  );
}

export const CueRow = memo(function CueRow({
  cue,
  depth,
  childCount,
  expanded,
  selected,
  primarySelected,
  active,
  missingAsset,
  pulseAsStopTarget,
  staticAsStopTarget,
  onHoverChange,
  onSelect,
  onContextMenu,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
}: CueRowProps) {
  const tokens = useGscTokens();
  const {
    canEdit,
    allCues,
    runningSequence,
    onGo,
    onRemove,
    onCreateStop,
    onCreateVolumeFade,
    onCreateOpacityFade,
    onCreateLightFade,
    onAssetDrop,
    onCueDrop,
    onCueReorder,
    onToggleExpand,
  } = useCueListActions();

  const playback = usePlaybackStore((s) => (active ? s.byCueId[cue.id] : undefined));

  const fixtures = useProjectStore((s) => s.fixtures);
  const isPreviewing = useUiStore((s) => s.dmxPreviewCueIds.includes(cue.id));
  const isContainer = isContainerCue(cue);
  const isStop = isStopCue(cue);
  const isFade = isFadeCue(cue);
  const isLightFade = isLightFadeCue(cue);
  const isSequence = isSequenceGroup(cue);
  const isParallel = isParallelGroup(cue);
  const stopTarget = isStop ? getStopTarget(cue, allCues) : undefined;
  const fadeTarget = isFade ? getFadeTarget(cue, allCues) : undefined;
  const stopTargetMissing = isStop && !stopTarget;
  const fadeTargetMissing = isFade && !isLightFade && !fadeTarget;
  const lightFadeTargetMissing = isLightFade && Boolean(cue.fadeTargetId) && !fadeTarget;
  const lightFadeMissing =
    isLightFade && !lightFadeTargetMissing && !isLightFadeReady(cue, fixtures, allCues);
  const assetWarning = getCueAssetWarning(cue);
  const parallelConflict = isParallel ? getParallelGroupOrderConflict(cue, allCues) : null;
  const isCurrentSequenceStep = runningSequence?.stepCueIds.includes(cue.id) ?? false;

  const hasWarning =
    missingAsset ||
    stopTargetMissing ||
    fadeTargetMissing ||
    lightFadeTargetMissing ||
    lightFadeMissing ||
    !!parallelConflict;
  const warningTitle = parallelConflict
    ? parallelConflict.tooltip
    : lightFadeTargetMissing
      ? "Reference cue missing"
      : lightFadeMissing
        ? "Add fixtures and levels to this light fade"
        : fadeTargetMissing
          ? "Fade target missing"
          : stopTargetMissing
            ? "Stop target missing"
            : assetWarning
              ? `${assetWarning.title} — drag from Assets onto this cue or the list`
              : "Warning";

  const { dropActive, insertPlace, onDragOver, onDragLeave, onDrop } = useCueRowDrop({
    cue,
    allCues,
    canEdit,
    onAssetDrop: (payload) => onAssetDrop(cue.id, payload),
    onCueDrop: (draggedId) => onCueDrop(draggedId, cue.id),
    onCueReorder,
  });

  const rowStyleState = {
    tokens,
    selected: selected && !primarySelected,
    primarySelected,
    active,
    isGroup: isContainer,
    isSequence,
    isStop,
    isVolumeFade: isFade && cue.type === "volumeFade",
    isOpacityFade: isFade && cue.type === "opacityFade",
    isLightFade: isFade && cue.type === "lightFade",
    isSequenceStep: isCurrentSequenceStep,
    hasWarning,
    pulseAsStopTarget,
    staticAsStopTarget,
    isPreviewing,
    dropActive: dropActive && isContainer,
    insertBefore: insertPlace === "before",
    insertAfter: insertPlace === "after",
  };

  return (
    <Box
      component="li"
      data-gsc-drop-zone="cue-row"
      data-cue-id={cue.id}
      sx={{
        ...cueRowSx(rowStyleState),
        pl: `${12 + depth * 16}px`,
      }}
      onMouseEnter={() => onHoverChange(cue.id)}
      onMouseLeave={(e) => {
        if (pointerLeftElement(e.currentTarget, e.relatedTarget)) {
          onHoverChange(null);
        }
      }}
      draggable={canEdit}
      onDragStart={
        canEdit
          ? (e) => {
              e.stopPropagation();
              setCueDragData(e.dataTransfer, { cueId: cue.id });
              setActiveCueDrag(cue.id);
            }
          : undefined
      }
      onDragEnd={() => setActiveCueDrag(null)}
      onClick={(e) => onSelect(e)}
      onContextMenu={canEdit ? onContextMenu : undefined}
      onDoubleClick={() => onGo(cue)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {hasWarning ? (
        <Tooltip title={warningTitle} arrow placement="right">
          <WarningAmberIcon fontSize="inherit" sx={cueRowWarningIconSx} />
        </Tooltip>
      ) : null}
      {isContainer ? (
        <IconButton
          size="small"
          aria-expanded={expanded}
          sx={cueExpandBtnSx(tokens)}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(cue.id);
          }}
        >
          {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>
      ) : (
        <Box component="span" sx={{ width: 24, flexShrink: 0 }} />
      )}
      <Box component="span" sx={cueNumberSx(tokens)}>
        {cue.number}
      </Box>
      <CueTypeBadge type={cue.type} showLabel={false} compact />
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0.25,
        }}
      >
        {isRenaming ? (
          <CueRenameInput
            value={renameValue}
            onChange={onRenameChange}
            onCommit={onRenameCommit}
            onCancel={onRenameCancel}
          />
        ) : (
          <Box component="span" sx={cueNameSx(rowStyleState)}>
            {getCueDisplayName(cue, allCues)}
          </Box>
        )}
        <CueRowDetails
          cue={cue}
          allCues={allCues}
          childCount={childCount}
          active={active}
          runningSequence={runningSequence}
          playback={playback}
        />
      </Box>
      <CueNotesIcon notes={cue.notes} />
      <CueRowActions
        cue={cue}
        canEdit={canEdit}
        onCreateStop={() => onCreateStop(cue.id)}
        onCreateVolumeFade={() => onCreateVolumeFade(cue.id)}
        onCreateOpacityFade={() => onCreateOpacityFade(cue.id)}
        onCreateLightFade={() => onCreateLightFade(cue.id)}
      />
      {cue.assetPath && (
        <Typography component="span" noWrap title={cue.assetPath} sx={cueAssetSx}>
          {cue.assetPath.split("/").pop()}
        </Typography>
      )}
      {canEdit && (
        <IconButton
          size="small"
          title="Delete cue"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(cue.id);
          }}
        >
          ×
        </IconButton>
      )}
    </Box>
  );
}, cueRowPropsAreEqual);
