import Box from "@mui/material/Box";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { hasCueListClipboard } from "../lib/cue-list-clipboard";
import { readCueListTabDragId, setActiveCueListTabDrag, setCueListTabDragData } from "../lib/drag";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import { useGscTokens } from "../theme/useGscTokens";
import { CueListTabContextMenu, type CueListTabContextMenuState } from "./CueListTabContextMenu";
import { useClearOnDragEnd } from "./cue-list/useClearOnDragEnd";

type TabDropTarget = { id: string; place: "before" | "after" };

export function CueListTabs() {
  const { t } = useTranslation();
  const tokens = useGscTokens();
  const showMode = useUiStore((s) => s.showMode);
  const canEdit = !showMode;
  const cueLists = useProjectStore((s) => s.cueLists);
  const activeCueListId = useProjectStore((s) => s.activeCueListId);
  const setActiveCueList = useProjectStore((s) => s.setActiveCueList);
  const addCueList = useProjectStore((s) => s.addCueList);
  const removeCueList = useProjectStore((s) => s.removeCueList);
  const renameCueList = useProjectStore((s) => s.renameCueList);
  const reorderCueListRelative = useProjectStore((s) => s.reorderCueListRelative);
  const copyCueList = useProjectStore((s) => s.copyCueList);
  const cutCueList = useProjectStore((s) => s.cutCueList);
  const pasteCueList = useProjectStore((s) => s.pasteCueList);
  const duplicateCueList = useProjectStore((s) => s.duplicateCueList);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dropTarget, setDropTarget] = useState<TabDropTarget | null>(null);
  const [contextMenu, setContextMenu] = useState<CueListTabContextMenuState | null>(null);

  const clearDropTarget = useCallback(() => {
    setDropTarget(null);
    setActiveCueListTabDrag(null);
  }, []);
  useClearOnDragEnd(clearDropTarget);

  const startRename = (listId: string, currentName: string) => {
    setRenamingId(listId);
    setRenameValue(currentName);
  };

  const commitRename = (listId: string) => {
    renameCueList(listId, renameValue);
    setRenamingId(null);
  };

  const handleTabContextMenu = (e: React.MouseEvent, listId: string) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, listId });
  };

  const handleTabDragOver = (e: React.DragEvent, listId: string) => {
    if (!canEdit) return;
    const draggedId = readCueListTabDragId(e.dataTransfer);
    if (draggedId === null || draggedId === listId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const place = e.clientX < rect.left + rect.width / 2 ? "before" : "after";
    setDropTarget({ id: listId, place });
  };

  const handleTabDrop = (e: React.DragEvent, listId: string) => {
    if (!canEdit) return;
    const draggedId = readCueListTabDragId(e.dataTransfer);
    if (draggedId === null) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const place = e.clientX < rect.left + rect.width / 2 ? "before" : "after";
    if (draggedId !== listId) {
      reorderCueListRelative(draggedId, listId, place);
    }
    clearDropTarget();
  };

  return (
    <>
      <Box
        role="tablist"
        aria-label={t("cueList.tabsAria")}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.25,
          pt: 0.75,
          px: 1,
          pb: 0,
          borderBottom: 1,
          borderColor: "divider",
          overflowX: "auto",
          overflowY: "clip",
          flexShrink: 0,
        }}
      >
        {cueLists.map((list) => {
          const active = list.id === activeCueListId;
          const topLevelCount = list.cues.filter((c) => !c.parentId).length;

          if (renamingId === list.id) {
            return (
              <Box
                key={list.id}
                component="input"
                value={renameValue}
                autoFocus
                onChange={(e) => setRenameValue(e.currentTarget.value)}
                onBlur={() => commitRename(list.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(list.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                sx={{
                  width: 120,
                  py: "5px",
                  px: 1,
                  font: "inherit",
                  fontSize: 12,
                  border: `1px solid ${tokens.accent}`,
                  borderRadius: "4px 4px 0 0",
                  bgcolor: tokens.bgElevated,
                  color: tokens.text,
                }}
              />
            );
          }

          const dropIndicator =
            dropTarget?.id === list.id
              ? dropTarget.place === "before"
                ? `inset 2px 0 0 ${tokens.accent}`
                : `inset -2px 0 0 ${tokens.accent}`
              : undefined;

          return (
            <Box
              key={list.id}
              component="button"
              type="button"
              role="tab"
              aria-selected={active}
              data-cue-list-id={list.id}
              draggable={canEdit}
              onClick={() => setActiveCueList(list.id)}
              onDragStart={
                canEdit
                  ? (e) => {
                      setCueListTabDragData(e.dataTransfer, { listId: list.id });
                    }
                  : undefined
              }
              onDragOver={(e) => handleTabDragOver(e, list.id)}
              onDragLeave={() => setDropTarget((prev) => (prev?.id === list.id ? null : prev))}
              onDrop={(e) => handleTabDrop(e, list.id)}
              onDragEnd={clearDropTarget}
              onContextMenu={(e) => handleTabContextMenu(e, list.id)}
              onDoubleClick={
                canEdit
                  ? (e) => {
                      e.stopPropagation();
                      startRename(list.id, list.name);
                    }
                  : undefined
              }
              title={
                canEdit
                  ? t("cueList.tabTitleEditable", { name: list.name, count: topLevelCount })
                  : t("cueList.tabTitle", { name: list.name, count: topLevelCount })
              }
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                maxWidth: 160,
                py: 0.75,
                px: 1,
                border: "1px solid transparent",
                borderBottom: "none",
                borderRadius: "4px 4px 0 0",
                bgcolor: "transparent",
                color: "text.secondary",
                font: "inherit",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                flexShrink: 0,
                "&:hover": {
                  bgcolor: tokens.bgHover,
                  color: tokens.text,
                },
                ...(active && {
                  bgcolor: tokens.bgElevated,
                  borderColor: "divider",
                  borderBottomColor: tokens.bgElevated,
                  color: tokens.text,
                  position: "relative",
                  zIndex: 1,
                }),
                boxShadow: dropIndicator,
              }}
            >
              <Box
                component="span"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {list.name}
              </Box>
              <Box
                component="span"
                sx={{
                  fontSize: 10,
                  fontVariantNumeric: "tabular-nums",
                  color: "text.secondary",
                  bgcolor: tokens.bg,
                  py: "1px",
                  px: 0.625,
                  borderRadius: 1,
                }}
              >
                {topLevelCount}
              </Box>
              {canEdit && cueLists.length > 1 && (
                <Box
                  component="span"
                  role="button"
                  tabIndex={-1}
                  aria-label={t("cueList.closeTabAria", { name: list.name })}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCueList(list.id);
                  }}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 16,
                    height: 16,
                    borderRadius: 0.75,
                    fontSize: 14,
                    lineHeight: 1,
                    color: "text.secondary",
                    "&:hover": {
                      bgcolor: "rgba(204, 68, 68, 0.2)",
                      color: "error.main",
                    },
                  }}
                >
                  ×
                </Box>
              )}
            </Box>
          );
        })}
        {canEdit && (
          <Box
            component="button"
            type="button"
            title={t("cueList.newListTitle")}
            aria-label={t("cueList.newListAria")}
            onClick={() => addCueList()}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 32,
              py: 0.75,
              px: 1,
              border: "1px solid transparent",
              borderBottom: "none",
              borderRadius: "4px 4px 0 0",
              bgcolor: "transparent",
              font: "inherit",
              fontSize: 16,
              fontWeight: 400,
              color: "text.secondary",
              cursor: "pointer",
              flexShrink: 0,
              "&:hover": {
                bgcolor: tokens.bgHover,
                color: tokens.text,
              },
            }}
          >
            +
          </Box>
        )}
      </Box>
      {canEdit && (
        <CueListTabContextMenu
          menu={contextMenu}
          canCut={cueLists.length > 1}
          canPaste={hasCueListClipboard()}
          onClose={() => setContextMenu(null)}
          onRename={() => {
            if (contextMenu) {
              const list = cueLists.find((l) => l.id === contextMenu.listId);
              if (list) startRename(list.id, list.name);
            }
          }}
          onCopy={() => contextMenu && copyCueList(contextMenu.listId)}
          onCut={() => contextMenu && cutCueList(contextMenu.listId)}
          onPaste={() => contextMenu && pasteCueList(contextMenu.listId)}
          onDuplicate={() => contextMenu && duplicateCueList(contextMenu.listId)}
        />
      )}
    </>
  );
}
