import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadAudioBuffer } from "../audio/buffer-cache";
import { getAssetKindLabel } from "../i18n/cueTypeLabels";
import { isExternalFileDrag, resolveAssetDropPayloads } from "../lib/asset-drop";
import { isAudioInputSupported } from "../lib/audio-input";
import {
  ASSET_FILE_ACCEPT,
  assetPayloadMatchesCue,
  filterAssetsForCue,
  getCueAssetDisplayName,
  getCueAssetWarning,
} from "../lib/cue-asset";
import { pointerLeftElement } from "../lib/dom";
import type { AssetDragPayload } from "../lib/drag";
import { isAssetDrag, setActiveAssetDrag } from "../lib/drag";
import { prefetchMediaDurations } from "../lib/media-duration";
import { useProjectStore } from "../stores/project";
import { useVfsStore } from "../stores/vfs";
import { cueListDropActiveSx } from "../theme/cueStyles";
import { useGscTokens } from "../theme/useGscTokens";
import type { AssetKind, Cue } from "../types/cue";
import { AudioRecorderDialog } from "./AudioRecorderDialog";
import { CueTypeBadge } from "./CueTypeIcon";
import { inspectorFieldLabelSx, inspectorGroupHintSx, inspectorHintSx } from "./inspectorSx";

interface CueAssetAssignProps {
  cue: Cue;
  readOnly?: boolean;
}

export function CueAssetAssign({ cue, readOnly = false }: CueAssetAssignProps) {
  const { t } = useTranslation();
  const tokens = useGscTokens();
  const entries = useVfsStore((s) => s.entries);
  const importFromFileList = useVfsStore((s) => s.importFromFileList);
  const updateCue = useProjectStore((s) => s.updateCue);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [dropActive, setDropActive] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const warning = getCueAssetWarning(cue);
  const hasAsset = Boolean(cue.assetPath);
  const assetName = getCueAssetDisplayName(cue, entries);
  const matchingAssets = filterAssetsForCue(entries, cue);
  const menuOpen = Boolean(menuAnchor);
  const kindLabel = getAssetKindLabel(cue.type as AssetKind);

  const resetFileInput = useCallback(() => {
    setFileInputKey((key) => key + 1);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const assignPayload = useCallback(
    (payload: AssetDragPayload) => {
      if (!assetPayloadMatchesCue(cue, payload)) {
        setError(t("assets.needsFile", { kind: kindLabel }));
        return false;
      }
      setError(null);
      updateCue(cue.id, { assetPath: payload.path });
      void prefetchMediaDurations([payload.path]);
      return true;
    },
    [cue, kindLabel, updateCue, t],
  );

  const clearAsset = useCallback(() => {
    if (readOnly) return;
    setError(null);
    resetFileInput();
    updateCue(cue.id, { assetPath: undefined });
  }, [cue.id, readOnly, resetFileInput, updateCue]);

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
            setError(t("assets.needsFile", { kind: kindLabel }));
          }
          return;
        }
        assignPayload(match);
      } finally {
        setActiveAssetDrag(null);
      }
    },
    [assignPayload, cue, kindLabel, readOnly, t],
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
      if (!files?.length || readOnly) {
        e.target.value = "";
        return;
      }
      const imported = await importFromFileList(files, { replaceExisting: true });
      e.target.value = "";
      const match = imported.find((a) => assetPayloadMatchesCue(cue, a));
      if (!match) {
        setError(t("assets.noFilesInSelection", { kind: kindLabel }));
        return;
      }
      assignPayload(match);
    },
    [assignPayload, cue, importFromFileList, kindLabel, readOnly, t],
  );

  const onSaveRecording = useCallback(
    async (file: File) => {
      const imported = await importFromFileList([file], { replaceExisting: true });
      const match = imported.find((a) => assetPayloadMatchesCue(cue, a));
      if (!match) {
        setError(t("assets.recordSaveFailed"));
        return;
      }
      assignPayload(match);
      void loadAudioBuffer(match.path);
    },
    [assignPayload, cue, importFromFileList, t],
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const assetMenu = (
    <Menu
      anchorEl={menuAnchor}
      open={menuOpen}
      onClose={() => setMenuAnchor(null)}
      slotProps={{ paper: { sx: { maxHeight: 280, minWidth: 240 } } }}
    >
      {matchingAssets.length === 0 ? (
        <MenuItem disabled>
          <ListItemText
            primary={t("assets.noFilesInAssets", { kind: kindLabel })}
            secondary={t("assets.dropOrImportHint")}
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
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography component="span" sx={inspectorFieldLabelSx}>
        {t("inspector.asset")}
      </Typography>

      {hasAsset ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            py: 0.75,
            px: 1,
            border: 1,
            borderColor: warning ? "warning.main" : "divider",
            borderRadius: 1,
            bgcolor: "background.paper",
          }}
        >
          <CueTypeBadge type={cue.type as AssetKind} showLabel={false} compact />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              component="span"
              noWrap
              title={cue.assetPath}
              sx={{ display: "block", fontSize: 13 }}
            >
              {assetName}
            </Typography>
            {warning ? (
              <Typography
                component="span"
                sx={{ display: "block", fontSize: 11, color: "warning.main", lineHeight: 1.3 }}
              >
                {warning.detail}
              </Typography>
            ) : null}
          </Box>
          {!readOnly && (
            <IconButton size="small" title={t("assets.clearAsset")} onClick={clearAsset}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ) : (
        <>
          {warning ? (
            <Typography component="p" sx={{ ...inspectorHintSx, color: "warning.main", m: 0 }}>
              {warning.detail}
            </Typography>
          ) : null}

          {!readOnly && (
            <>
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
                  {t("assets.dropFileHere", { kind: kindLabel })}
                </Typography>
                <Typography component="p" sx={{ ...inspectorHintSx, m: 0, mt: 0.5 }}>
                  {t("assets.fromAssetsOrComputer")}
                </Typography>
                <Button
                  type="button"
                  variant="text"
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={openFilePicker}
                >
                  {t("assets.browseFiles")}
                </Button>
              </Box>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                >
                  {t("assets.selectAsset")}
                </Button>
                {cue.type === "audio" && isAudioInputSupported() && (
                  <Button
                    type="button"
                    variant="outlined"
                    size="small"
                    onClick={() => setRecordOpen(true)}
                  >
                    {t("assets.record")}
                  </Button>
                )}
              </Box>
            </>
          )}
        </>
      )}

      <input
        key={fileInputKey}
        ref={fileInputRef}
        type="file"
        hidden
        multiple
        accept={ASSET_FILE_ACCEPT[cue.type as AssetKind]}
        onChange={onBrowseFiles}
      />

      <AudioRecorderDialog
        open={recordOpen}
        cueName={cue.name}
        onClose={() => setRecordOpen(false)}
        onSave={onSaveRecording}
      />

      {assetMenu}

      {error ? (
        <Typography component="p" sx={{ ...inspectorHintSx, color: "error.main", m: 0 }}>
          {error}
        </Typography>
      ) : null}
    </Box>
  );
}
