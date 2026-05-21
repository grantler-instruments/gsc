import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useCallback, useRef, useState } from "react";
import {
  assetPayloadMatchesCue,
  ASSET_FILE_ACCEPT,
  filterAssetsForCue,
  getCueAssetWarning,
} from "../lib/cue-asset";
import { isExternalFileDrag, resolveAssetDropPayloads } from "../lib/asset-drop";
import { pointerLeftElement } from "../lib/dom";
import { isAssetDrag, setActiveAssetDrag } from "../lib/drag";
import type { AssetDragPayload } from "../lib/drag";
import { prefetchMediaDurations } from "../lib/media-duration";
import { useProjectStore } from "../stores/project";
import { useVfsStore } from "../stores/vfs";
import { useGscTokens } from "../theme/useGscTokens";
import { cueListDropActiveSx } from "../theme/cueStyles";
import type { AssetKind, Cue } from "../types/cue";
import { CueTypeBadge } from "./CueTypeIcon";
import { inspectorGroupHintSx, inspectorHintSx } from "./inspectorSx";

interface CueAssetAssignProps {
  cue: Cue;
  readOnly?: boolean;
}

export function CueAssetAssign({ cue, readOnly = false }: CueAssetAssignProps) {
  const tokens = useGscTokens();
  const entries = useVfsStore((s) => s.entries);
  const importFromFileList = useVfsStore((s) => s.importFromFileList);
  const updateCue = useProjectStore((s) => s.updateCue);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [dropActive, setDropActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const warning = getCueAssetWarning(cue);
  const matchingAssets = filterAssetsForCue(entries, cue);
  const menuOpen = Boolean(menuAnchor);

  const assignPayload = useCallback(
    (payload: AssetDragPayload) => {
      if (!assetPayloadMatchesCue(cue, payload)) {
        setError(`This cue needs a ${cue.type} file.`);
        return false;
      }
      setError(null);
      updateCue(cue.id, { assetPath: payload.path });
      void prefetchMediaDurations([payload.path]);
      return true;
    },
    [cue, updateCue],
  );

  const onSelectAsset = (payload: AssetDragPayload) => {
    assignPayload(payload);
    setMenuAnchor(null);
  };

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropActive(false);
      if (readOnly) return;
      if (!isAssetDrag(e.dataTransfer) && !isExternalFileDrag(e.dataTransfer)) {
        return;
      }
      try {
        const payloads = await resolveAssetDropPayloads(e.dataTransfer);
        const match = payloads.find((p) => assetPayloadMatchesCue(cue, p));
        if (!match) {
          if (payloads.length > 0) {
            setError(`This cue needs a ${cue.type} file.`);
          }
          return;
        }
        assignPayload(match);
      } finally {
        setActiveAssetDrag(null);
      }
    },
    [assignPayload, cue, readOnly],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (readOnly) return;
      if (!isAssetDrag(e.dataTransfer) && !isExternalFileDrag(e.dataTransfer)) {
        setDropActive(false);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "link";
      setDropActive(true);
    },
    [readOnly],
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (pointerLeftElement(e.currentTarget, e.relatedTarget)) {
      setDropActive(false);
    }
  }, []);

  const onBrowseFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      e.target.value = "";
      if (!files?.length || readOnly) return;
      const imported = await importFromFileList(files);
      const match = imported.find((a) => assetPayloadMatchesCue(cue, a));
      if (!match) {
        setError(`No ${cue.type} files in selection.`);
        return;
      }
      assignPayload(match);
    },
    [assignPayload, cue, importFromFileList, readOnly],
  );

  if (!warning) return null;

  const kindLabel = cue.type;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography component="p" sx={{ ...inspectorHintSx, color: "warning.main", m: 0 }}>
        {warning.detail}
      </Typography>

      {!readOnly && (
        <>
          <Button
            variant="outlined"
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{ alignSelf: "flex-start" }}
          >
            Select asset
          </Button>

          <Menu
            anchorEl={menuAnchor}
            open={menuOpen}
            onClose={() => setMenuAnchor(null)}
            slotProps={{ paper: { sx: { maxHeight: 280, minWidth: 240 } } }}
          >
            {matchingAssets.length === 0 ? (
              <MenuItem disabled>
                <ListItemText
                  primary={`No ${kindLabel} files in Assets`}
                  secondary="Drop a file below or import in Assets"
                />
              </MenuItem>
            ) : (
              matchingAssets.map((entry) => (
                <MenuItem
                  key={entry.path}
                  onClick={() =>
                    onSelectAsset({
                      path: entry.path,
                      name: entry.name,
                      kind: entry.kind,
                    })
                  }
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CueTypeBadge type={entry.kind} showLabel={false} />
                  </ListItemIcon>
                  <ListItemText primary={entry.name} secondary={entry.path} />
                </MenuItem>
              ))
            )}
          </Menu>

          <Box
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            sx={{
              border: 1,
              borderStyle: "dashed",
              borderColor: dropActive ? "primary.main" : "divider",
              borderRadius: 1,
              px: 1.5,
              py: 2,
              textAlign: "center",
              cursor: "default",
              ...(dropActive && cueListDropActiveSx(tokens)),
            }}
          >
            <Typography component="p" sx={{ ...inspectorGroupHintSx, m: 0 }}>
              Drop a {kindLabel} file here
            </Typography>
            <Typography
              component="p"
              sx={{ ...inspectorHintSx, m: 0, mt: 0.5 }}
            >
              From Assets or your computer
            </Typography>
            <Button
              variant="text"
              size="small"
              sx={{ mt: 1 }}
              onClick={() => fileInputRef.current?.click()}
            >
              Browse files…
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              multiple
              accept={ASSET_FILE_ACCEPT[cue.type as AssetKind]}
              onChange={onBrowseFiles}
            />
          </Box>
        </>
      )}

      {error ? (
        <Typography component="p" sx={{ ...inspectorHintSx, color: "error.main", m: 0 }}>
          {error}
        </Typography>
      ) : null}
    </Box>
  );
}
