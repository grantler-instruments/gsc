import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpacityIcon from "@mui/icons-material/Opacity";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
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
  isUtilityCue,
  type CueListNode,
} from "../lib/cues";
import {
  canOpacityFadeTarget,
  canVolumeFadeTarget,
  resolveFadeFromLevel,
} from "../lib/fade";
import { formatMidiCue } from "../lib/midi";
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
import { vfsHas } from "../vfs/engine";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { AddCueMenu } from "./AddCueMenu";
import { CueListTabs } from "./CueListTabs";
import { CueNotesIcon } from "./CueNotesIcon";
import { CueTypeBadge } from "./CueTypeIcon";
import { PanelHeader } from "./layout/PanelHeader";
import { useActiveCueList } from "../stores/project";

function cueNeedsAsset(cue: Cue): boolean {
  return cue.type === "audio" || cue.type === "video" || cue.type === "image";
}

function cueMissingAsset(cue: Cue): boolean {
  if (!cueNeedsAsset(cue)) return false;
  if (!cue.assetPath) return true;
  return !vfsHas(cue.assetPath);
}

export function CueList() {
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
  const activeCueIds = useTransportStore((s) => s.activeCueIds);
  const runningSequence = useTransportStore((s) => s.runningSequence);
  const [listDropActive, setListDropActive] = useState(false);
  const showMode = useUiStore((s) => s.showMode);
  const canEdit = !showMode;
  const collapsedCueGroupIds = useUiStore((s) => s.collapsedCueGroupIds);
  const toggleCueGroupCollapsed = useUiStore((s) => s.toggleCueGroupCollapsed);
  const collapsedGroups = useMemo(
    () => new Set(collapsedCueGroupIds),
    [collapsedCueGroupIds],
  );
  const [hoveredCueId, setHoveredCueId] = useState<string | null>(null);

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
      if (isCueDrag(e.dataTransfer) && cuePayload) {
        // Cue reorder is handled on rows; only unparent when dropped on empty list.
        if (e.target === e.currentTarget) {
          moveCueToGroup(cuePayload.cueId, null);
        }
        return;
      }

      if (!isAssetDrag(e.dataTransfer) && !isExternalFileDrag(e.dataTransfer)) {
        return;
      }

      void (async () => {
        const payloads = await resolveAssetDropPayloads(e.dataTransfer);
        for (const payload of payloads) {
          addCueFromAsset(payload);
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
      className="cue-list-panel"
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <CueListTabs />
      <PanelHeader>
        <Chip
          label={cues.filter((c) => !c.parentId).length}
          size="small"
          variant="outlined"
          sx={{
            height: "auto",
            fontSize: 11,
            "& .MuiChip-label": { px: 1, py: 0.125 },
          }}
        />
        {selectedCueIds.length > 1 && (
          <Chip
            label={`${selectedCueIds.length} selected`}
            size="small"
            sx={{
              height: "auto",
              fontSize: 11,
              bgcolor: "action.hover",
              "& .MuiChip-label": { px: 1, py: 0.125 },
            }}
          />
        )}
        {canEdit && (
          <Typography
            variant="overline"
            color="text.secondary"
            title="Group selected cues into a parallel group"
          >
            ⌘G
          </Typography>
        )}
      </PanelHeader>

      <Box
        component="ul"
        className={["cue-list", listDropActive && "cue-list-drop-active"]
          .filter(Boolean)
          .join(" ")}
        onDragOver={onListDragOver}
        onDragLeave={onListDragLeave}
        onDrop={onListDrop}
        sx={{ listStyle: "none", m: 0, p: 0 }}
      >
        {tree.length === 0 && (
          <Box component="li" className="cue-list-empty">
            {canEdit
              ? "Drag assets here to create cues, or use + Cue below."
              : "No cues in this list."}
          </Box>
        )}
        {renderNodes(tree)}
      </Box>

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
}: CueRowProps) {
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
  const isUtility = isUtilityCue(cue);
  const stopTarget = isStop ? getStopTarget(cue, allCues) : undefined;
  const fadeTarget = isFade ? getFadeTarget(cue, allCues) : undefined;
  const stopTargetMissing = isStop && !stopTarget;
  const fadeTargetMissing = isFade && !fadeTarget;
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
    !isContainer && !isUtility && cue.type !== "midi"
      ? formatPlaybackRangeLabel(cue.inTime, cue.outTime, cue.type === "image")
      : null;
  const loopLabel =
    cue.type === "audio" || cue.type === "video"
      ? formatLoopLabel(cue)
      : null;

  return (
    <li
      className={[
        "cue-row",
        isContainer && "cue-row-group",
        isSequence && "cue-row-sequence",
        isStop && "cue-row-stop",
        isFade && cue.type === "volumeFade" && "cue-row-volume-fade",
        isFade && cue.type === "opacityFade" && "cue-row-opacity-fade",
        isCurrentSequenceStep && "cue-row-sequence-step",
        selected && !primarySelected && "cue-row-selected",
        primarySelected && "cue-row-primary-selected",
        pulseAsStopTarget && "cue-row-stop-target-linked",
        staticAsStopTarget && "cue-row-stop-target-linked-static",
        active && "cue-row-active",
        (missingAsset || stopTargetMissing || fadeTargetMissing) &&
          "cue-row-warning",
        dropActive && isContainer && "cue-row-drop-active",
        insertPlace === "before" && "cue-row-drop-before",
        insertPlace === "after" && "cue-row-drop-after",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ paddingLeft: `${12 + depth * 16}px` }}
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
            }
          : undefined
      }
      onClick={(e) => onSelect(e)}
      onDoubleClick={onGo}
      onDragOver={(e) => {
        if (!canEdit) return;
        const cuePayload = readCueDragData(e.dataTransfer);
        const draggingCue = isCueDrag(e.dataTransfer) && !!cuePayload;
        const draggingAsset =
          isAssetDrag(e.dataTransfer) || isExternalFileDrag(e.dataTransfer);
        if (!draggingCue && !draggingAsset) return;

        e.preventDefault();
        e.stopPropagation();

        if (draggingCue && cuePayload.cueId !== cue.id) {
          const dragged = allCues.find((c) => c.id === cuePayload.cueId);
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

        const cuePayload = readCueDragData(e.dataTransfer);
        if (isCueDrag(e.dataTransfer) && cuePayload) {
          if (place && cuePayload.cueId !== cue.id) {
            onCueReorder(cuePayload.cueId, cue.id, place);
            return;
          }
          if (isContainer && cuePayload.cueId !== cue.id) {
            onCueDrop(cuePayload.cueId);
            return;
          }
          return;
        }

        if (!isAssetDrag(e.dataTransfer) && !isExternalFileDrag(e.dataTransfer)) {
          return;
        }

        void (async () => {
          const payloads = await resolveAssetDropPayloads(e.dataTransfer);
          if (!payloads.length) return;
          if (isContainer) {
            for (const payload of payloads) {
              onAssetDrop(payload);
            }
          } else {
            onAssetDrop(payloads[0]);
          }
        })();
      }}
    >
      {isContainer ? (
        <IconButton
          size="small"
          className="cue-expand-btn"
          aria-expanded={expanded}
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
        <span className="cue-expand-spacer" />
      )}
      <span className="cue-number">{cue.number}</span>
      <CueTypeBadge
        type={cue.type}
        showLabel={false}
        className="cue-row-type"
      />
      <div className="cue-row-main">
        <span className="cue-name">{getCueDisplayName(cue, allCues)}</span>
        {isParallel && (
          <span className="cue-detail">
            {childCount === 0
              ? "Empty — drag cues here (parallel)"
              : `${childCount} cue${childCount === 1 ? "" : "s"} · parallel`}
          </span>
        )}
        {isSequence && (
          <span className="cue-detail">
            {sequenceProgress
              ? `Playing step ${sequenceProgress.currentStep + 1} of ${sequenceProgress.stepCount}`
              : childCount === 0
                ? "Empty — drag cues here (sequential)"
                : `${childCount} cue${childCount === 1 ? "" : "s"} · sequential`}
          </span>
        )}
        {stopTargetMissing && (
          <span className="cue-detail">Target cue missing</span>
        )}
        {fadeTargetMissing && (
          <span className="cue-detail">Fade target missing</span>
        )}
        {fadeDetail && <span className="cue-detail">{fadeDetail}</span>}
        {cue.type === "midi" && cue.midi && (
          <span className="cue-detail">{formatMidiCue(cue.midi)}</span>
        )}
        {rangeLabel && <span className="cue-detail">{rangeLabel}</span>}
        {loopLabel && <span className="cue-detail">{loopLabel}</span>}
        {active && playback && cueShowsPlaybackProgress(cue) && (
          <PlaybackProgress progress={playback} compact />
        )}
      </div>
      <CueNotesIcon notes={cue.notes} />
      {canEdit && !isUtility && (
        <>
          {showVolumeFadeAction && (
            <IconButton
              size="small"
              className="cue-row-action cue-row-action-fade"
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
              className="cue-row-action cue-row-action-fade"
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
            className="cue-row-action cue-row-action-stop"
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
        <span className="cue-asset" title={cue.assetPath}>
          {cue.assetPath.split("/").pop()}
        </span>
      )}
      {(missingAsset || stopTargetMissing || fadeTargetMissing) && (
        <span
          className="cue-warning"
          title={
            fadeTargetMissing
              ? "Fade target missing"
              : stopTargetMissing
                ? "Stop target missing"
                : "Asset missing or not loaded"
          }
        >
          !
        </span>
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
    </li>
  );
}
