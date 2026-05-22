import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpacityIcon from "@mui/icons-material/Opacity";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  flattenVisibleCueIds,
  getPrimarySelectedCueId,
} from "../lib/cue-selection";
import type { AssetDragPayload } from "../lib/drag";
import {
  isAssetDropDrag,
  isExternalFileDrag,
  resolveAssetDropPayloads,
} from "../lib/asset-drop";
import {
  isAssetDrag,
  isCueDrag,
  readCueDragData,
  readCueDragId,
  setActiveAssetDrag,
  setActiveCueDrag,
  setCueDragData,
} from "../lib/drag";
import { pointerLeftElement } from "../lib/dom";
import { cueShowsPlaybackProgress } from "../lib/playback-slice";
import { PlaybackProgress } from "./PlaybackProgress";
import { usePlaybackStore } from "../stores/playback";
import {
  buildCueTree,
  getChildCues,
  getCueDisplayName,
  getFadeTarget,
  cuesShareParent,
  getStopTarget,
  isContainerCue,
  isCueActive,
  isFadeCue,
  isParallelGroup,
  isSequenceGroup,
  isStopCue,
  isWaitCue,
  isUtilityCue,
  type CueListNode,
} from "../lib/cues";
import {
  canOpacityFadeTarget,
  canVolumeFadeTarget,
  resolveFadeFromLevel,
} from "../lib/fade";
import { formatMidiCue } from "../lib/midi";
import { formatOscCue } from "../lib/osc";
import { formatWaitDurationLabel } from "../lib/wait";
import { formatLoopLabel } from "../lib/loop";
import { formatPlaybackRangeLabel } from "../lib/time";
import { triggerGoAndAdvance } from "../lib/transport-actions";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import {
  useTransportStore,
  type RunningSequence,
} from "../stores/transport";
import type { Cue } from "../types/cue";
import { cueMissingAsset, getCueAssetWarning } from "../lib/cue-asset";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { AddCueMenu } from "./AddCueMenu";
import { CueContextMenu, type CueContextMenuState } from "./CueContextMenu";
import { CueListTabs } from "./CueListTabs";
import { CueNotesIcon } from "./CueNotesIcon";
import { CueTypeBadge } from "./CueTypeIcon";
import { useActiveCueList } from "../stores/project";
import { useGscTokens } from "../theme/useGscTokens";
import {
  cueAssetSx,
  cueDetailSx,
  cueExpandBtnSx,
  cueListDropActiveSx,
  cueListEmptySx,
  cueNameSx,
  cueNumberSx,
  cueRenameInputSx,
  cueRowFadeActionSx,
  cueRowStopActionSx,
  cueRowSx,
  cueRowWarningIconSx,
} from "../theme/cueStyles";

export function CueList() {
  const tokens = useGscTokens();
  const showMode = useUiStore((s) => s.showMode);
  const activeList = useActiveCueList();
  const cues = activeList.cues;
  const selectedCueIds = activeList.selectedCueIds;
  const selectCue = useProjectStore((s) => s.selectCue);
  const toggleSelectCue = useProjectStore((s) => s.toggleSelectCue);
  const selectCueRange = useProjectStore((s) => s.selectCueRange);
  const primarySelectedId = getPrimarySelectedCueId(selectedCueIds);
  const selectedCueIdSet = useMemo(
    () => new Set(selectedCueIds),
    [selectedCueIds],
  );
  const removeCue = useProjectStore((s) => s.removeCue);
  const updateCue = useProjectStore((s) => s.updateCue);
  const addCue = useProjectStore((s) => s.addCue);
  const addStopCueForTarget = useProjectStore((s) => s.addStopCueForTarget);
  const addFadeCueForTarget = useProjectStore((s) => s.addFadeCueForTarget);
  const moveCueToGroup = useProjectStore((s) => s.moveCueToGroup);
  const reorderCueRelative = useProjectStore((s) => s.reorderCueRelative);
  const copySelectedCues = useProjectStore((s) => s.copySelectedCues);
  const duplicateSelectedCues = useProjectStore((s) => s.duplicateSelectedCues);
  const activeCueIds = useTransportStore((s) => s.activeCueIds);
  const runningSequence = useTransportStore((s) => s.runningSequence);
  const [listDropActive, setListDropActive] = useState(false);
  const canEdit = !showMode;
  const collapsedCueGroupIds = useUiStore((s) => s.collapsedCueGroupIds);
  const toggleCueGroupCollapsed = useUiStore((s) => s.toggleCueGroupCollapsed);
  const collapsedGroups = useMemo(
    () => new Set(collapsedCueGroupIds),
    [collapsedCueGroupIds],
  );
  const [hoveredCueId, setHoveredCueId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<CueContextMenuState | null>(
    null,
  );
  const [renamingCueId, setRenamingCueId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const tree = useMemo(() => buildCueTree(cues), [cues]);

  const visibleCueOrder = useMemo(
    () => flattenVisibleCueIds(cues, collapsedGroups),
    [cues, collapsedGroups],
  );

  const handleRowSelect = useCallback(
    (cueId: string, e: MouseEvent) => {
      if (e.shiftKey) {
        selectCueRange(cueId, visibleCueOrder);
      } else if (e.metaKey || e.ctrlKey) {
        toggleSelectCue(cueId);
      } else {
        selectCue(cueId);
      }
    },
    [selectCue, selectCueRange, toggleSelectCue, visibleCueOrder],
  );

  const handleRowContextMenu = useCallback(
    (cueId: string, e: MouseEvent) => {
      if (!canEdit) return;
      e.preventDefault();
      e.stopPropagation();

      if (!selectedCueIdSet.has(cueId)) {
        selectCue(cueId);
      }

      setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, cueId });
    },
    [canEdit, selectCue, selectedCueIdSet],
  );

  const contextMenuCue = contextMenu
    ? cues.find((c) => c.id === contextMenu.cueId)
    : undefined;
  const canRenameFromMenu =
    !!contextMenuCue &&
    selectedCueIds.length === 1 &&
    !isUtilityCue(contextMenuCue);

  const startRename = useCallback((cueId: string) => {
    const cue = cues.find((c) => c.id === cueId);
    if (!cue || isUtilityCue(cue)) return;
    setRenamingCueId(cueId);
    setRenameValue(cue.name);
  }, [cues]);

  const commitRename = useCallback(
    (cueId: string) => {
      const trimmed = renameValue.trim();
      if (trimmed) {
        updateCue(cueId, { name: trimmed });
      }
      setRenamingCueId(null);
    },
    [renameValue, updateCue],
  );

  const cancelRename = useCallback(() => {
    setRenamingCueId(null);
  }, []);

  const hoveredStopTargetId = useMemo(() => {
    const cue = cues.find((c) => c.id === hoveredCueId);
    if (!cue || !isStopCue(cue)) return null;
    return getStopTarget(cue, cues)?.id ?? null;
  }, [cues, hoveredCueId]);

  const selectedStopTargetId = useMemo(() => {
    const cue = cues.find((c) => c.id === primarySelectedId);
    if (!cue || !isStopCue(cue)) return null;
    return getStopTarget(cue, cues)?.id ?? null;
  }, [cues, primarySelectedId]);

  const toggleGroup = (groupId: string) => {
    toggleCueGroupCollapsed(groupId);
  };

  const handleGo = useCallback((cue: Cue) => {
    triggerGoAndAdvance(cue);
  }, []);

  const addCueFromAsset = useCallback(
    (payload: AssetDragPayload, parentId?: string) => {
      addCue({
        name: payload.name,
        type: payload.kind,
        assetPath: payload.path,
        parentId,
      });
    },
    [addCue],
  );

  const assignAssetToCue = useCallback(
    (cueId: string, payload: AssetDragPayload) => {
      updateCue(cueId, {
        assetPath: payload.path,
        name: payload.name,
        type: payload.kind,
        midi: undefined,
      });
      selectCue(cueId);
    },
    [updateCue, selectCue],
  );

  const onListDragOver = useCallback((e: React.DragEvent) => {
    if (!canEdit) return;
    if (!isAssetDropDrag(e.dataTransfer) && !isCueDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = isCueDrag(e.dataTransfer) ? "move" : "copy";
    setListDropActive(true);
  }, [canEdit]);

  const onListDragLeave = useCallback((e: React.DragEvent) => {
    if (pointerLeftElement(e.currentTarget, e.relatedTarget)) {
      setListDropActive(false);
    }
  }, []);

  const onListDrop = useCallback(
    (e: React.DragEvent) => {
      setListDropActive(false);
      e.preventDefault();
      if (!canEdit) return;

      const cuePayload = readCueDragData(e.dataTransfer);
      const draggedCueId = cuePayload?.cueId ?? readCueDragId(e.dataTransfer);
      if (draggedCueId) {
        // Cue reorder is handled on rows; only unparent when dropped on empty list.
        if (e.target === e.currentTarget) {
          moveCueToGroup(draggedCueId, null);
        }
        setActiveCueDrag(null);
        return;
      }

      if (!isAssetDrag(e.dataTransfer) && !isExternalFileDrag(e.dataTransfer)) {
        return;
      }

      void (async () => {
        try {
          const payloads = await resolveAssetDropPayloads(e.dataTransfer);
          for (const payload of payloads) {
            addCueFromAsset(payload);
          }
        } finally {
          setActiveAssetDrag(null);
        }
      })();
    },
    [addCueFromAsset, canEdit, moveCueToGroup],
  );

  const renderNodes = (nodes: CueListNode[]): ReactNode[] =>
    nodes.flatMap((node) => {
      const expanded = !collapsedGroups.has(node.cue.id);
      const childCount = isContainerCue(node.cue)
        ? getChildCues(cues, node.cue.id).length
        : 0;
      const row = (
        <CueRow
          key={node.cue.id}
          cue={node.cue}
          depth={node.depth}
          childCount={childCount}
          expanded={expanded}
          selected={selectedCueIdSet.has(node.cue.id)}
          primarySelected={node.cue.id === primarySelectedId}
          active={isCueActive(
            node.cue,
            cues,
            activeCueIds,
            runningSequence,
          )}
          runningSequence={runningSequence}
          allCues={cues}
          missingAsset={cueMissingAsset(node.cue)}
          pulseAsStopTarget={node.cue.id === hoveredStopTargetId}
          staticAsStopTarget={node.cue.id === selectedStopTargetId}
          onHoverChange={setHoveredCueId}
          onSelect={(e) => handleRowSelect(node.cue.id, e)}
          onContextMenu={(e) => handleRowContextMenu(node.cue.id, e)}
          onGo={() => handleGo(node.cue)}
          onRemove={() => removeCue(node.cue.id)}
          onCreateStop={() => addStopCueForTarget(node.cue.id)}
          onCreateVolumeFade={() =>
            addFadeCueForTarget(node.cue.id, "volumeFade")
          }
          onCreateOpacityFade={() =>
            addFadeCueForTarget(node.cue.id, "opacityFade")
          }
          onAssetDrop={(payload) => {
            if (isContainerCue(node.cue)) {
              addCueFromAsset(payload, node.cue.id);
            } else {
              assignAssetToCue(node.cue.id, payload);
            }
          }}
          onCueDrop={(cueId) => moveCueToGroup(cueId, node.cue.id)}
          onCueReorder={reorderCueRelative}
          onToggleExpand={() => toggleGroup(node.cue.id)}
          canEdit={canEdit}
          isRenaming={renamingCueId === node.cue.id}
          renameValue={renameValue}
          onRenameChange={setRenameValue}
          onRenameCommit={() => commitRename(node.cue.id)}
          onRenameCancel={cancelRename}
        />
      );

      if (isContainerCue(node.cue) && expanded && node.children.length > 0) {
        return [row, ...renderNodes(node.children)];
      }
      return [row];
    });

  return (
    <Box
      component="section"
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        borderRight:
          !showMode && getPrimarySelectedCueId(selectedCueIds) ? 1 : 0,
        borderColor: "divider",
      }}
    >
      <CueListTabs />

      <Box
        component="ul"
        data-gsc-drop-zone="cue-list"
        onDragOver={onListDragOver}
        onDragOverCapture={onListDragOver}
        onDragLeave={onListDragLeave}
        onDrop={onListDrop}
        sx={{
          listStyle: "none",
          m: 0,
          p: 0,
          overflowY: "auto",
          flex: 1,
          minHeight: 120,
          ...(listDropActive && cueListDropActiveSx(tokens)),
        }}
      >
        {tree.length === 0 && (
          <Box component="li" sx={cueListEmptySx}>
            {canEdit
              ? "Drag assets here to create cues, or use + Cue below."
              : "No cues in this list."}
          </Box>
        )}
        {renderNodes(tree)}
      </Box>

      {canEdit && (
        <CueContextMenu
          menu={contextMenu}
          canRename={canRenameFromMenu}
          onClose={() => setContextMenu(null)}
          onCopy={copySelectedCues}
          onDuplicate={duplicateSelectedCues}
          onRename={() => {
            if (contextMenu) startRename(contextMenu.cueId);
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

interface CueRowProps {
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
  onGo: () => void;
  onRemove: () => void;
  onCreateStop: () => void;
  onCreateVolumeFade: () => void;
  onCreateOpacityFade: () => void;
  onAssetDrop: (payload: AssetDragPayload) => void;
  onCueDrop: (cueId: string) => void;
  onCueReorder: (
    draggedId: string,
    targetId: string,
    place: "before" | "after",
  ) => void;
  onToggleExpand: () => void;
  canEdit: boolean;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (value: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  runningSequence: RunningSequence | null;
  allCues: Cue[];
}

function CueRow({
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
  allCues,
  runningSequence,
  onHoverChange,
  onSelect,
  onContextMenu,
  onGo,
  onRemove,
  onCreateStop,
  onCreateVolumeFade,
  onCreateOpacityFade,
  onAssetDrop,
  onCueDrop,
  onCueReorder,
  onToggleExpand,
  canEdit,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
}: CueRowProps) {
  const tokens = useGscTokens();
  const [dropActive, setDropActive] = useState(false);
  const [insertPlace, setInsertPlace] = useState<"before" | "after" | null>(
    null,
  );
  const insertPlaceRef = useRef<"before" | "after" | null>(null);
  const playback = usePlaybackStore((s) =>
    active ? s.byCueId[cue.id] : undefined,
  );
  const isContainer = isContainerCue(cue);
  const isParallel = isParallelGroup(cue);
  const isSequence = isSequenceGroup(cue);
  const isStop = isStopCue(cue);
  const isFade = isFadeCue(cue);
  const isWait = isWaitCue(cue);
  const isUtility = isUtilityCue(cue);
  const stopTarget = isStop ? getStopTarget(cue, allCues) : undefined;
  const fadeTarget = isFade ? getFadeTarget(cue, allCues) : undefined;
  const stopTargetMissing = isStop && !stopTarget;
  const fadeTargetMissing = isFade && !fadeTarget;
  const assetWarning = getCueAssetWarning(cue);
  const showVolumeFadeAction = canVolumeFadeTarget(cue);
  const showOpacityFadeAction = canOpacityFadeTarget(cue);
  const fadeDetail =
    isFade && fadeTarget
      ? `${resolveFadeFromLevel(cue, fadeTarget).toFixed(2)} → ${cue.fadeTo ?? 0} · ${cue.fadeDuration ?? 2}s`
      : null;
  const isCurrentSequenceStep =
    runningSequence?.stepCueIds.includes(cue.id) ?? false;
  const sequenceProgress =
    isSequence && runningSequence?.rootId === cue.id
      ? runningSequence
      : null;
  const rangeLabel =
    !isContainer && !isUtility && cue.type !== "midi" && cue.type !== "osc"
      ? formatPlaybackRangeLabel(cue.inTime, cue.outTime, cue.type === "image")
      : null;
  const loopLabel =
    cue.type === "audio" || cue.type === "video"
      ? formatLoopLabel(cue)
      : null;
  const hasWarning =
    missingAsset || stopTargetMissing || fadeTargetMissing;
  const warningTitle = fadeTargetMissing
    ? "Fade target missing"
    : stopTargetMissing
      ? "Stop target missing"
      : assetWarning
        ? `${assetWarning.title} — drag from Assets onto this cue or the list`
        : "Warning";
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
    isSequenceStep: isCurrentSequenceStep,
    hasWarning,
    pulseAsStopTarget,
    staticAsStopTarget,
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
      onDoubleClick={onGo}
      onDragOver={(e) => {
        if (!canEdit) return;
        const draggedCueId = readCueDragId(e.dataTransfer);
        const draggingCue = draggedCueId !== null;
        const draggingAsset =
          !draggingCue &&
          (isAssetDrag(e.dataTransfer) || isExternalFileDrag(e.dataTransfer));
        if (!draggingCue && !draggingAsset) return;

        e.preventDefault();
        e.stopPropagation();

        if (draggingCue && draggedCueId !== cue.id) {
          const dragged = allCues.find((c) => c.id === draggedCueId);
          if (dragged && isContainer) {
            e.dataTransfer.dropEffect = "move";
            insertPlaceRef.current = null;
            setInsertPlace(null);
            setDropActive(true);
            return;
          }
          if (dragged && cuesShareParent(dragged, cue)) {
            const rect = e.currentTarget.getBoundingClientRect();
            const place =
              e.clientY < rect.top + rect.height / 2 ? "before" : "after";
            e.dataTransfer.dropEffect = "move";
            insertPlaceRef.current = place;
            setInsertPlace(place);
            setDropActive(false);
            return;
          }
        }

        if (draggingAsset) {
          e.dataTransfer.dropEffect = isContainer ? "copy" : "link";
          insertPlaceRef.current = null;
          setInsertPlace(null);
          setDropActive(true);
        }
      }}
      onDragLeave={(e) => {
        if (pointerLeftElement(e.currentTarget, e.relatedTarget)) {
          setDropActive(false);
          insertPlaceRef.current = null;
          setInsertPlace(null);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canEdit) return;

        setDropActive(false);
        const place = insertPlaceRef.current;
        insertPlaceRef.current = null;
        setInsertPlace(null);

        const draggedCueId = readCueDragId(e.dataTransfer);
        if (draggedCueId) {
          if (place && draggedCueId !== cue.id) {
            onCueReorder(draggedCueId, cue.id, place);
            setActiveCueDrag(null);
            return;
          }
          if (isContainer && draggedCueId !== cue.id) {
            onCueDrop(draggedCueId);
            setActiveCueDrag(null);
            return;
          }
          setActiveCueDrag(null);
          return;
        }

        if (isCueDrag(e.dataTransfer)) {
          setActiveCueDrag(null);
          return;
        }

        if (!isAssetDrag(e.dataTransfer) && !isExternalFileDrag(e.dataTransfer)) {
          return;
        }

        void (async () => {
          try {
            const payloads = await resolveAssetDropPayloads(e.dataTransfer);
            if (!payloads.length) return;
            if (isContainer) {
              for (const payload of payloads) {
                onAssetDrop(payload);
              }
            } else {
              onAssetDrop(payloads[0]);
            }
          } finally {
            setActiveAssetDrag(null);
          }
        })();
      }}
    >
      {hasWarning ? (
        <WarningAmberIcon
          fontSize="inherit"
          sx={cueRowWarningIconSx}
          titleAccess={warningTitle}
        />
      ) : null}
      {isContainer ? (
        <IconButton
          size="small"
          aria-expanded={expanded}
          sx={cueExpandBtnSx(tokens)}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
        >
          {expanded ? (
            <ExpandMoreIcon fontSize="small" />
          ) : (
            <ChevronRightIcon fontSize="small" />
          )}
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
          <Box
            component="input"
            value={renameValue}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onRenameChange(e.currentTarget.value)}
            onBlur={onRenameCommit}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") onRenameCommit();
              if (e.key === "Escape") onRenameCancel();
            }}
            sx={cueRenameInputSx(tokens)}
          />
        ) : (
          <Box component="span" sx={cueNameSx(rowStyleState)}>
            {getCueDisplayName(cue, allCues)}
          </Box>
        )}
        {isParallel && (
          <Typography component="span" sx={cueDetailSx}>
            {childCount === 0
              ? "Empty — drag cues here (parallel)"
              : `${childCount} cue${childCount === 1 ? "" : "s"} · parallel`}
          </Typography>
        )}
        {isSequence && (
          <Typography component="span" sx={cueDetailSx}>
            {sequenceProgress
              ? `Playing step ${sequenceProgress.currentStep + 1} of ${sequenceProgress.stepCount}`
              : childCount === 0
                ? "Empty — drag cues here (sequential)"
                : `${childCount} cue${childCount === 1 ? "" : "s"} · sequential`}
          </Typography>
        )}
        {stopTargetMissing && (
          <Typography component="span" sx={cueDetailSx}>
            Target cue missing
          </Typography>
        )}
        {fadeTargetMissing && (
          <Typography component="span" sx={cueDetailSx}>
            Fade target missing
          </Typography>
        )}
        {isWait && (
          <Typography component="span" sx={cueDetailSx}>
            Hold {formatWaitDurationLabel(cue)}
          </Typography>
        )}
        {assetWarning && (
          <Typography component="span" sx={cueDetailSx}>
            {assetWarning.detail}
          </Typography>
        )}
        {fadeDetail && (
          <Typography component="span" sx={cueDetailSx}>
            {fadeDetail}
          </Typography>
        )}
        {cue.type === "midi" && cue.midi && (
          <Typography component="span" sx={cueDetailSx}>
            {formatMidiCue(cue.midi)}
          </Typography>
        )}
        {cue.type === "osc" && cue.osc && (
          <Typography component="span" sx={cueDetailSx}>
            {formatOscCue(cue.osc)}
          </Typography>
        )}
        {rangeLabel && (
          <Typography component="span" sx={cueDetailSx}>
            {rangeLabel}
          </Typography>
        )}
        {loopLabel && (
          <Typography component="span" sx={cueDetailSx}>
            {loopLabel}
          </Typography>
        )}
        {active && playback && cueShowsPlaybackProgress(cue) && (
          <PlaybackProgress
            progress={playback}
            compact
            tone={isWait ? "wait" : "media"}
          />
        )}
      </Box>
      <CueNotesIcon notes={cue.notes} />
      {canEdit && !isUtility && (
        <>
          {showVolumeFadeAction && (
            <IconButton
              size="small"
              sx={cueRowFadeActionSx}
              title={`Create volume fade for ${cue.number}`}
              aria-label={`Create volume fade for ${cue.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onCreateVolumeFade();
              }}
            >
              <VolumeDownIcon fontSize="small" />
            </IconButton>
          )}
          {showOpacityFadeAction && (
            <IconButton
              size="small"
              sx={cueRowFadeActionSx}
              title={`Create opacity fade for ${cue.number}`}
              aria-label={`Create opacity fade for ${cue.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onCreateOpacityFade();
              }}
            >
              <OpacityIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton
            size="small"
            sx={cueRowStopActionSx}
            title={`Create stop cue for ${cue.number}`}
            aria-label={`Create stop cue for ${cue.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onCreateStop();
            }}
          >
            <StopCircleOutlinedIcon fontSize="small" />
          </IconButton>
        </>
      )}
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
            onRemove();
          }}
        >
          ×
        </IconButton>
      )}
    </Box>
  );
}
