import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useRef, useState } from "react";
import { isExternalFileDrag } from "../lib/asset-drop";
import { pointerLeftElement } from "../lib/dom";
import { isAssetDrag, setActiveAssetDrag, setAssetDragData } from "../lib/drag";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import type { VfsEntry } from "../stores/vfs";
import { useVfsStore } from "../stores/vfs";
import { cueListDropActiveSx } from "../theme/cueStyles";
import { useGscTokens } from "../theme/useGscTokens";
import { CueTypeBadge } from "./CueTypeIcon";

const emptyListSx = {
  py: 2,
  px: 1.5,
  color: "text.secondary",
  fontSize: 13,
} as const;

export function AssetsPanel() {
  const tokens = useGscTokens();
  const showMode = useUiStore((s) => s.showMode);
  const canEdit = !showMode;
  const entries = useVfsStore((s) => s.entries);
  const importFromDrop = useVfsStore((s) => s.importFromDrop);
  const importFromFileList = useVfsStore((s) => s.importFromFileList);
  const removeEntry = useVfsStore((s) => s.removeEntry);
  const addCue = useProjectStore((s) => s.addCue);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropActive, setDropActive] = useState(false);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      setDropActive(false);
      e.preventDefault();
      e.stopPropagation();
      if (!canEdit) return;
      // Re-dropping an asset from this panel — nothing to import.
      if (isAssetDrag(e.dataTransfer) && !isExternalFileDrag(e.dataTransfer)) {
        return;
      }
      if (!isExternalFileDrag(e.dataTransfer)) return;
      await importFromDrop(e.dataTransfer);
    },
    [canEdit, importFromDrop],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (isAssetDrag(e.dataTransfer) && !isExternalFileDrag(e.dataTransfer)) {
        setDropActive(false);
        return;
      }
      if (!isExternalFileDrag(e.dataTransfer)) {
        setDropActive(false);
        return;
      }
      e.preventDefault();
      if (!canEdit) {
        e.dataTransfer.dropEffect = "none";
        setDropActive(false);
        return;
      }
      e.dataTransfer.dropEffect = "copy";
      setDropActive(true);
    },
    [canEdit],
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (pointerLeftElement(e.currentTarget, e.relatedTarget)) {
      setDropActive(false);
    }
  }, []);

  const onFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files?.length) await importFromFileList(files);
      e.target.value = "";
    },
    [importFromFileList],
  );

  return (
    <Box
      data-gsc-drop-zone="assets"
      onDropCapture={onDrop}
      onDragOverCapture={onDragOver}
      onDragLeaveCapture={onDragLeave}
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        ...(dropActive && cueListDropActiveSx(tokens)),
      }}
    >
      <Typography variant="caption" sx={{ px: 1.5, py: 1, m: 0, flexShrink: 0 }}>
        {canEdit
          ? "Drop audio, video, or image files here. Drag assets to the cue list to add cues."
          : "Assets are view-only in show mode."}
      </Typography>

      <Box
        component="ul"
        sx={{
          listStyle: "none",
          m: 0,
          py: 0.5,
          px: 0,
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
        }}
      >
        {entries.length === 0 && (
          <Box component="li" sx={emptyListSx}>
            No assets yet
          </Box>
        )}
        {entries.map((entry) => (
          <Box
            component="li"
            key={entry.path}
            draggable={canEdit}
            onDragStart={canEdit ? (e) => onAssetDragStart(e, entry) : undefined}
            onDragEnd={canEdit ? () => setActiveAssetDrag(null) : undefined}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              py: 0.75,
              px: 1.5,
              borderBottom: 1,
              borderColor: "divider",
              "&:hover": { bgcolor: tokens.bgHover },
              ...(canEdit && {
                cursor: "grab",
                "&:active": { cursor: "grabbing" },
              }),
            }}
          >
            <CueTypeBadge type={entry.kind} showLabel={false} compact />
            <Typography
              component="span"
              noWrap
              title={entry.path}
              sx={{ flex: 1, minWidth: 0, fontSize: 13 }}
            >
              {entry.name}
            </Typography>
            {canEdit && (
              <Stack direction="row" sx={{ gap: 0.25, flexShrink: 0 }}>
                <IconButton
                  size="small"
                  title="Add as cue"
                  onClick={() =>
                    addCue({
                      name: entry.name,
                      type: entry.kind,
                      assetPath: entry.path,
                    })
                  }
                >
                  +
                </IconButton>
                <IconButton size="small" title="Remove" onClick={() => removeEntry(entry.path)}>
                  ×
                </IconButton>
              </Stack>
            )}
          </Box>
        ))}
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
          <Button
            variant="text"
            fullWidth
            title={canEdit ? undefined : "Disabled in show mode"}
            onClick={() => inputRef.current?.click()}
          >
            Import
          </Button>
        </Box>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        // @ts-expect-error webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        directory=""
        onChange={onFileInput}
      />
    </Box>
  );
}

function onAssetDragStart(e: React.DragEvent, entry: VfsEntry) {
  setAssetDragData(e.dataTransfer, {
    path: entry.path,
    name: entry.name,
    kind: entry.kind,
  });
}
