import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { type MouseEvent, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  applyAssetPayloads,
  isAssetDropDrag,
  isExternalFileDrag,
  resolveAssetDropPayloads,
} from "../../lib/asset-drop";
import { findCueInLists } from "../../lib/cue-lists";
import { getPrimarySelectedCueId } from "../../lib/cue-selection";
import {
  getChildCues,
  getCueDisplayName,
  getTopLevelCues,
  isContainerCue,
  isCueActive,
} from "../../lib/cues";
import { pointerLeftElement } from "../../lib/dom";
import {
  isAssetDrag,
  readCueDragId,
  setActiveAssetDrag,
  setActiveCueDrag,
  setCueDragData,
} from "../../lib/drag";
import { triggerHotCueAndFocusMain } from "../../lib/transport-actions";
import { useFadeStore } from "../../stores/fade";
import { useActiveCueList, useProjectStore } from "../../stores/project";
import { useTransportStore } from "../../stores/transport";
import { useUiStore } from "../../stores/ui";
import { hotCuePadTargetSx } from "../../theme/cueStyles";
import { useGscTokens } from "../../theme/useGscTokens";
import type { Cue } from "../../types/cue";
import { CueTypeBadge } from "../CueTypeIcon";
import { CueRowActions } from "../cue-list/CueRowActions";
import { useCueListStopHighlights } from "../cue-list/useCueListStopHighlights";
import { useRestartCssAnimation } from "../cue-list/useRestartCssAnimation";
import { CueTargetActionsMenu, type CueTargetActionsMenuState } from "./CueTargetActionsMenu";

/** Pad selection uses border styling; hide the browser/MUI default focus ring. */
const suppressPadFocusRing = {
  "&:focus": { outline: "none" },
  "&:focus-visible": { outline: "none" },
  "&.Mui-focusVisible": { outline: "none", boxShadow: "none" },
} as const;

/**
 * Cue-cart style grid for a hot cue list. Each pad has a GO button that fires
 * via triggerHotCue; clicking the rest of the pad focuses it for the inspector.
 * In edit mode assets can be dropped and row actions are available.
 */
export function HotCueGrid({ listId }: { listId?: string }) {
  const { t } = useTranslation();
  const tokens = useGscTokens();
  const showMode = useUiStore((s) => s.showMode);
  const canEdit = !showMode;
  const activeList = useActiveCueList();
  const listById = useProjectStore((s) =>
    listId ? s.cueLists.find((l) => l.id === listId) : undefined,
  );
  const list = listById ?? activeList;
  const cues = list.cues;
  const selectedCueIds = list.selectedCueIds;
  const activeCueListId = useProjectStore((s) => s.activeCueListId);
  const hotListFocused = activeCueListId === list.id;
  const activeCueIds = useTransportStore((s) => s.activeCueIds);
  const runningSequences = useTransportStore((s) => s.runningSequences);
  const dmxFadesByFadeCueId = useFadeStore((s) => s.dmxFadesByFadeCueId);
  const setActiveCueList = useProjectStore((s) => s.setActiveCueList);
  const selectCue = useProjectStore((s) => s.selectCue);
  const addStopCueForTarget = useProjectStore((s) => s.addStopCueForTarget);
  const addFadeCueForTarget = useProjectStore((s) => s.addFadeCueForTarget);
  const moveCueToList = useProjectStore((s) => s.moveCueToList);
  const reorderCueRelative = useProjectStore((s) => s.reorderCueRelative);
  const [dropActive, setDropActive] = useState(false);
  const [padMenu, setPadMenu] = useState<CueTargetActionsMenuState | null>(null);

  const focusList = useCallback(() => {
    if (useProjectStore.getState().activeCueListId !== list.id) {
      setActiveCueList(list.id);
    }
  }, [list.id, setActiveCueList]);

  const handleSelect = useCallback(
    (cue: Cue) => {
      focusList();
      selectCue(cue.id);
    },
    [focusList, selectCue],
  );

  const handleListDrop = useCallback(
    (e: React.DragEvent) => {
      setDropActive(false);
      e.preventDefault();
      if (!canEdit) return;

      const draggedCueId = readCueDragId(e.dataTransfer);
      if (draggedCueId) {
        focusList();
        const source = findCueInLists(useProjectStore.getState().cueLists, draggedCueId);
        if (source && source.list.id !== list.id) {
          moveCueToList(draggedCueId, list.id, { kind: "append" });
        } else {
          const topLevelCues = getTopLevelCues(list.cues);
          const lastTopLevel = topLevelCues[topLevelCues.length - 1];
          if (lastTopLevel && lastTopLevel.id !== draggedCueId) {
            reorderCueRelative(draggedCueId, lastTopLevel.id, "after");
          }
        }
        setActiveCueDrag(null);
        return;
      }

      if (!isAssetDrag(e.dataTransfer) && !isExternalFileDrag(e.dataTransfer)) return;
      focusList();
      void (async () => {
        try {
          const payloads = await resolveAssetDropPayloads(e.dataTransfer);
          applyAssetPayloads(payloads, { kind: "list", listId: list.id });
        } finally {
          setActiveAssetDrag(null);
        }
      })();
    },
    [canEdit, focusList, list.cues, list.id, moveCueToList, reorderCueRelative],
  );

  const handleRowDrop = useCallback(
    (cueId: string, e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropActive(false);
      if (!canEdit) return;

      const draggedCueId = readCueDragId(e.dataTransfer);
      if (draggedCueId && draggedCueId !== cueId) {
        focusList();
        const rect = e.currentTarget.getBoundingClientRect();
        const place = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
        const source = findCueInLists(useProjectStore.getState().cueLists, draggedCueId);
        if (source && source.list.id !== list.id) {
          moveCueToList(draggedCueId, list.id, { kind: place, cueId });
        } else {
          reorderCueRelative(draggedCueId, cueId, place);
        }
        setActiveCueDrag(null);
        return;
      }

      if (!isAssetDrag(e.dataTransfer) && !isExternalFileDrag(e.dataTransfer)) return;
      focusList();
      // If an asset was dropped onto a specific hot cue, select it so the
      // inspector (incl. preview) reflects the updated cue immediately.
      selectCue(cueId);
      void (async () => {
        try {
          const payloads = await resolveAssetDropPayloads(e.dataTransfer);
          applyAssetPayloads(payloads, { kind: "row", listId: list.id, cueId });
        } finally {
          setActiveAssetDrag(null);
        }
      })();
    },
    [canEdit, focusList, list.id, moveCueToList, reorderCueRelative, selectCue],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!canEdit) return;
      const draggingCue = readCueDragId(e.dataTransfer) !== null;
      if (!draggingCue && !isAssetDropDrag(e.dataTransfer)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = draggingCue ? "move" : "copy";
      setDropActive(true);
    },
    [canEdit],
  );

  const onPadDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!canEdit) return;
      const draggedCueId = readCueDragId(e.dataTransfer);
      if (!draggedCueId && !isAssetDropDrag(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = draggedCueId ? "move" : "copy";
    },
    [canEdit],
  );

  const topLevel = getTopLevelCues(cues);
  const primarySelectedId = getPrimarySelectedCueId(selectedCueIds);
  const stopHighlights = useCueListStopHighlights(cues, primarySelectedId);
  const padMenuCue = padMenu ? cues.find((c) => c.id === padMenu.cueId) : undefined;

  const handlePadContextMenu = useCallback(
    (cue: Cue, e: MouseEvent) => {
      if (!canEdit) return;
      e.preventDefault();
      e.stopPropagation();
      focusList();
      selectCue(cue.id);
      setPadMenu({ mouseX: e.clientX, mouseY: e.clientY, cueId: cue.id });
    },
    [canEdit, focusList, selectCue],
  );

  if (topLevel.length === 0) {
    return (
      <Box
        onDragOver={onDragOver}
        onDragLeave={() => setDropActive(false)}
        onDrop={handleListDrop}
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          m: 1,
          color: "text.secondary",
          fontSize: 13,
          textAlign: "center",
          borderRadius: 1.5,
          border: dropActive ? `2px dashed ${tokens.accent}` : "2px dashed transparent",
        }}
      >
        {canEdit ? t("hotCues.emptyEditable") : t("hotCues.empty")}
      </Box>
    );
  }

  return (
    <>
      <Box
        onDragOver={onDragOver}
        onDragLeave={() => setDropActive(false)}
        onDrop={handleListDrop}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          p: 1,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gridAutoRows: "minmax(72px, auto)",
          gap: 1,
          alignContent: "start",
          ...(dropActive && { outline: `2px dashed ${tokens.accent}`, outlineOffset: -4 }),
        }}
      >
        {topLevel.map((cue) => {
          const isCueSelected = selectedCueIds.includes(cue.id);
          return (
            <HotCueButton
              key={cue.id}
              cue={cue}
              cues={cues}
              canEdit={canEdit}
              active={isCueActive(cue, cues, activeCueIds, runningSequences, dmxFadesByFadeCueId)}
              selected={hotListFocused && isCueSelected}
              childCount={isContainerCue(cue) ? getChildCues(cues, cue.id).length : 0}
              accent={tokens.accent}
              pulseAsStopTarget={cue.id === stopHighlights.hoveredStopTargetId}
              staticAsStopTarget={cue.id === stopHighlights.selectedStopTargetId}
              highlightAsFadeTarget={
                cue.id === stopHighlights.hoveredFadeTargetId ||
                cue.id === stopHighlights.selectedFadeTargetId
              }
              fadeTargetHighlightToken={stopHighlights.fadeTargetHighlightToken}
              onHoverChange={stopHighlights.setHoveredCueId}
              onSelect={() => handleSelect(cue)}
              onFire={() => triggerHotCueAndFocusMain(cue)}
              onContextMenu={(e) => handlePadContextMenu(cue, e)}
              onCreateStop={() => addStopCueForTarget(cue.id)}
              onCreateVolumeFade={() => addFadeCueForTarget(cue.id, "volumeFade")}
              onCreateOpacityFade={() => addFadeCueForTarget(cue.id, "opacityFade")}
              onCreatePanFade={() => addFadeCueForTarget(cue.id, "panFade")}
              onCreateLightFade={() => addFadeCueForTarget(cue.id, "lightFade")}
              onDrop={canEdit ? (e) => handleRowDrop(cue.id, e) : undefined}
              onDragOver={canEdit ? onPadDragOver : undefined}
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
              onDragEnd={canEdit ? () => setActiveCueDrag(null) : undefined}
            />
          );
        })}
      </Box>
      <CueTargetActionsMenu
        menu={padMenu}
        cue={padMenuCue}
        onClose={() => setPadMenu(null)}
        onCreateStop={() => padMenuCue && addStopCueForTarget(padMenuCue.id)}
        onCreateVolumeFade={() => padMenuCue && addFadeCueForTarget(padMenuCue.id, "volumeFade")}
        onCreateOpacityFade={() => padMenuCue && addFadeCueForTarget(padMenuCue.id, "opacityFade")}
        onCreatePanFade={() => padMenuCue && addFadeCueForTarget(padMenuCue.id, "panFade")}
        onCreateLightFade={() => padMenuCue && addFadeCueForTarget(padMenuCue.id, "lightFade")}
      />
    </>
  );
}

function HotCueButton({
  cue,
  cues,
  canEdit,
  active,
  selected,
  childCount,
  accent,
  pulseAsStopTarget,
  staticAsStopTarget,
  highlightAsFadeTarget,
  fadeTargetHighlightToken,
  onHoverChange,
  onSelect,
  onFire,
  onContextMenu,
  onCreateStop,
  onCreateVolumeFade,
  onCreateOpacityFade,
  onCreatePanFade,
  onCreateLightFade,
  onDrop,
  onDragOver,
  draggable = false,
  onDragStart,
  onDragEnd,
}: {
  cue: Cue;
  cues: Cue[];
  canEdit: boolean;
  active: boolean;
  selected: boolean;
  childCount: number;
  accent: string;
  pulseAsStopTarget: boolean;
  staticAsStopTarget: boolean;
  highlightAsFadeTarget: boolean;
  fadeTargetHighlightToken: string;
  onHoverChange: (cueId: string | null) => void;
  onSelect: () => void;
  onFire: () => void;
  onContextMenu: (e: MouseEvent) => void;
  onCreateStop: () => void;
  onCreateVolumeFade: () => void;
  onCreateOpacityFade: () => void;
  onCreatePanFade: () => void;
  onCreateLightFade: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}) {
  const { t } = useTranslation();
  const tokens = useGscTokens();
  const [hovered, setHovered] = useState(false);
  const showActions = canEdit && (selected || hovered);
  const buttonRef = useRef<HTMLElement>(null);
  useRestartCssAnimation(buttonRef, highlightAsFadeTarget, fadeTargetHighlightToken);

  const isTargetHighlight = pulseAsStopTarget || staticAsStopTarget || highlightAsFadeTarget;

  const padSx = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 0.5,
    p: 1,
    textAlign: "left",
    border: selected ? 2 : 1,
    borderColor: selected ? accent : "divider",
    borderRadius: 1.5,
    bgcolor: active ? `${accent}22` : selected ? `${accent}10` : "background.paper",
    color: "text.primary",
    font: "inherit",
    cursor: "pointer",
    transition: "background-color 80ms, border-color 80ms",
    width: "100%",
    height: "100%",
    minHeight: 72,
    ...(!isTargetHighlight && {
      "&:hover": { bgcolor: `${accent}14` },
    }),
    ...hotCuePadTargetSx({
      tokens,
      pulseAsStopTarget,
      staticAsStopTarget,
      highlightAsFadeTarget,
    }),
  } as const;

  const padContent = (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, width: "100%" }}>
        <CueTypeBadge type={cue.type} showLabel={false} compact />
        <Box
          component="span"
          sx={{
            fontSize: 10,
            fontVariantNumeric: "tabular-nums",
            color: "text.secondary",
          }}
        >
          {cue.number}
        </Box>
        {childCount > 0 && (
          <Box component="span" sx={{ ml: "auto", fontSize: 10, color: "text.secondary" }}>
            {t("hotCues.childCount", { count: childCount })}
          </Box>
        )}
      </Box>
      <Box
        component="span"
        sx={{
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {getCueDisplayName(cue, cues)}
      </Box>
    </>
  );

  return (
    <Box
      sx={{ position: "relative", minHeight: 72 }}
      onMouseEnter={() => {
        setHovered(true);
        onHoverChange(cue.id);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        if (pointerLeftElement(e.currentTarget, e.relatedTarget)) {
          onHoverChange(null);
        }
      }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {showActions && (
        <Box
          sx={{
            position: "absolute",
            top: 2,
            right: 2,
            zIndex: 1,
            display: "flex",
            gap: 0,
            bgcolor: "background.paper",
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          <CueRowActions
            cue={cue}
            canEdit={canEdit}
            onCreateStop={onCreateStop}
            onCreateVolumeFade={onCreateVolumeFade}
            onCreateOpacityFade={onCreateOpacityFade}
            onCreatePanFade={onCreatePanFade}
            onCreateLightFade={onCreateLightFade}
          />
        </Box>
      )}
      <Box
        ref={buttonRef}
        sx={{
          ...padSx,
          display: "flex",
          flexDirection: "column",
          p: 0,
          overflow: "hidden",
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={onSelect}
          onContextMenu={canEdit ? onContextMenu : undefined}
          title={getCueDisplayName(cue, cues)}
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 0.5,
            p: 1,
            pb: 0.5,
            m: 0,
            border: 0,
            bgcolor: "transparent",
            color: "inherit",
            font: "inherit",
            textAlign: "left",
            cursor: "pointer",
            minWidth: 0,
            "&:active": { opacity: 0.85 },
            ...suppressPadFocusRing,
          }}
        >
          {padContent}
        </Box>
        <Box sx={{ px: 1, pb: 1, pt: 0.25 }}>
          <Button
            fullWidth
            size="small"
            variant="contained"
            color="success"
            disableFocusRipple
            onClick={(e) => {
              e.stopPropagation();
              onFire();
            }}
            sx={suppressPadFocusRing}
          >
            {t("transport.go")}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
