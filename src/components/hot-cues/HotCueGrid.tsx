import Box from "@mui/material/Box";
import { type MouseEvent, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  applyAssetPayloads,
  isAssetDropDrag,
  isExternalFileDrag,
  resolveAssetDropPayloads,
} from "../../lib/asset-drop";
import {
  getChildCues,
  getCueDisplayName,
  getTopLevelCues,
  isContainerCue,
  isCueActive,
} from "../../lib/cues";
import { isAssetDrag, setActiveAssetDrag } from "../../lib/drag";
import { triggerHotCue } from "../../lib/transport-actions";
import { useFadeStore } from "../../stores/fade";
import { useActiveCueList, useProjectStore } from "../../stores/project";
import { useTransportStore } from "../../stores/transport";
import { useUiStore } from "../../stores/ui";
import { useGscTokens } from "../../theme/useGscTokens";
import type { Cue } from "../../types/cue";
import { CueTypeBadge } from "../CueTypeIcon";
import { CueRowActions } from "../cue-list/CueRowActions";
import { CueTargetActionsMenu, type CueTargetActionsMenuState } from "./CueTargetActionsMenu";

/**
 * Cue-cart style grid for a hot cue list. In show mode each cue is a button that
 * fires as an overlay via triggerHotCue; in edit mode clicking selects the cue
 * for the inspector and assets can be dropped to add or assign cues.
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
  const activeCueIds = useTransportStore((s) => s.activeCueIds);
  const runningSequences = useTransportStore((s) => s.runningSequences);
  const dmxFadesByFadeCueId = useFadeStore((s) => s.dmxFadesByFadeCueId);
  const setActiveCueList = useProjectStore((s) => s.setActiveCueList);
  const selectCue = useProjectStore((s) => s.selectCue);
  const addStopCueForTarget = useProjectStore((s) => s.addStopCueForTarget);
  const addFadeCueForTarget = useProjectStore((s) => s.addFadeCueForTarget);
  const [dropActive, setDropActive] = useState(false);
  const [padMenu, setPadMenu] = useState<CueTargetActionsMenuState | null>(null);

  const focusList = useCallback(() => {
    if (useProjectStore.getState().activeCueListId !== list.id) {
      setActiveCueList(list.id);
    }
  }, [list.id, setActiveCueList]);

  const handleSelect = useCallback(
    (cue: Cue) => {
      if (!canEdit) {
        triggerHotCue(cue);
        return;
      }
      focusList();
      selectCue(cue.id);
    },
    [canEdit, focusList, selectCue],
  );

  const handleListDrop = useCallback(
    (e: React.DragEvent) => {
      setDropActive(false);
      e.preventDefault();
      if (!canEdit) return;
      if (!isAssetDrag(e.dataTransfer) && !isExternalFileDrag(e.dataTransfer)) return;
      focusList();
      void (async () => {
        try {
          const payloads = await resolveAssetDropPayloads(e.dataTransfer);
          applyAssetPayloads(payloads, { kind: "list" });
        } finally {
          setActiveAssetDrag(null);
        }
      })();
    },
    [canEdit, focusList],
  );

  const handleRowDrop = useCallback(
    (cueId: string, e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropActive(false);
      if (!canEdit) return;
      if (!isAssetDrag(e.dataTransfer) && !isExternalFileDrag(e.dataTransfer)) return;
      focusList();
      void (async () => {
        try {
          const payloads = await resolveAssetDropPayloads(e.dataTransfer);
          applyAssetPayloads(payloads, { kind: "row", cueId });
        } finally {
          setActiveAssetDrag(null);
        }
      })();
    },
    [canEdit, focusList],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!canEdit || !isAssetDropDrag(e.dataTransfer)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDropActive(true);
    },
    [canEdit],
  );

  const topLevel = getTopLevelCues(cues);
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
        {topLevel.map((cue) => (
          <HotCueButton
            key={cue.id}
            cue={cue}
            cues={cues}
            canEdit={canEdit}
            active={isCueActive(cue, cues, activeCueIds, runningSequences, dmxFadesByFadeCueId)}
            selected={canEdit && selectedCueIds.includes(cue.id)}
            childCount={isContainerCue(cue) ? getChildCues(cues, cue.id).length : 0}
            accent={tokens.accent}
            onSelect={() => handleSelect(cue)}
            onFire={() => triggerHotCue(cue)}
            onContextMenu={(e) => handlePadContextMenu(cue, e)}
            onCreateStop={() => addStopCueForTarget(cue.id)}
            onCreateVolumeFade={() => addFadeCueForTarget(cue.id, "volumeFade")}
            onCreateOpacityFade={() => addFadeCueForTarget(cue.id, "opacityFade")}
            onCreatePanFade={() => addFadeCueForTarget(cue.id, "panFade")}
            onCreateLightFade={() => addFadeCueForTarget(cue.id, "lightFade")}
            onDrop={canEdit ? (e) => handleRowDrop(cue.id, e) : undefined}
            onDragOver={canEdit ? onDragOver : undefined}
          />
        ))}
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
}: {
  cue: Cue;
  cues: Cue[];
  canEdit: boolean;
  active: boolean;
  selected: boolean;
  childCount: number;
  accent: string;
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
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const showActions = canEdit && (selected || hovered);

  const padSx = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 0.5,
    p: 1,
    textAlign: "left",
    border: selected ? 2 : 1,
    borderColor: selected ? accent : active ? accent : "divider",
    borderRadius: 1.5,
    bgcolor: active ? `${accent}22` : selected ? `${accent}10` : "background.paper",
    color: "text.primary",
    font: "inherit",
    cursor: "pointer",
    transition: "background-color 80ms, border-color 80ms",
    width: "100%",
    height: "100%",
    "&:hover": { borderColor: accent, bgcolor: `${accent}14` },
    "&:active": { transform: "translateY(1px)" },
  } as const;

  return (
    <Box
      sx={{ position: "relative", minHeight: 72 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDrop={onDrop}
      onDragOver={onDragOver}
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
        component="button"
        type="button"
        onClick={onSelect}
        onDoubleClick={onFire}
        onContextMenu={onContextMenu}
        title={getCueDisplayName(cue, cues)}
        sx={padSx}
      >
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
      </Box>
    </Box>
  );
}
