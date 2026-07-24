import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAssetKindLabel } from "../i18n/cueTypeLabels";
import {
  type AssetTechnicalMetadata,
  ensureAssetTechnicalMetadata,
  getAssetTechnicalMetadata,
} from "../lib/asset-technical-metadata";
import { findAssetCueUsages } from "../lib/cue-asset";
import { useProjectStore } from "../stores/project";
import { useVfsStore } from "../stores/vfs";
import { inspectorFieldLabelSx, inspectorReadonlySx } from "./inspectorSx";

interface AssetMetadataDialogProps {
  assetPath: string | null;
  onClose: () => void;
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  const units = ["KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length);
  return `${(size / 1024 ** exponent).toFixed(exponent === 1 ? 0 : 1)} ${units[exponent - 1]}`;
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
    : `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatBitRate(bitsPerSecond: number): string {
  return `${Math.round(bitsPerSecond / 1000).toLocaleString()} kbps`;
}

function formatFrameRate(framesPerSecond: number): string {
  return `${framesPerSecond.toFixed(framesPerSecond % 1 === 0 ? 0 : 3)} fps`;
}

export function AssetMetadataDialog({ assetPath, onClose }: AssetMetadataDialogProps) {
  const { t } = useTranslation();
  const entry = useVfsStore((s) => s.entries.find((candidate) => candidate.path === assetPath));
  const cueLists = useProjectStore((s) => s.cueLists);
  const [technicalMetadata, setTechnicalMetadata] = useState<AssetTechnicalMetadata>();
  const usages = useMemo(
    () => (assetPath ? findAssetCueUsages(cueLists, assetPath) : []),
    [assetPath, cueLists],
  );

  useEffect(() => {
    if (!assetPath || !entry?.loaded) {
      setTechnicalMetadata(undefined);
      return;
    }
    setTechnicalMetadata(getAssetTechnicalMetadata(assetPath));
    void ensureAssetTechnicalMetadata(assetPath, entry.kind).then(setTechnicalMetadata);
  }, [assetPath, entry?.kind, entry?.loaded]);

  return (
    <Dialog open={Boolean(assetPath)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("assets.metadata.title")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
        <MetadataField label={t("assets.metadata.name")} value={entry?.name ?? assetPath ?? ""} />
        <MetadataField label={t("assets.metadata.path")} value={assetPath ?? ""} />
        {entry ? (
          <>
            <MetadataField
              label={t("assets.metadata.type")}
              value={getAssetKindLabel(entry.kind)}
            />
            <MetadataField label={t("assets.metadata.size")} value={formatFileSize(entry.size)} />
            <MetadataField
              label={t("assets.metadata.mimeType")}
              value={entry.mimeType || t("assets.metadata.unknown")}
            />
            <MetadataField
              label={t("assets.metadata.availability")}
              value={
                entry.loaded ? t("assets.metadata.available") : t("assets.metadata.unavailable")
              }
            />
            {technicalMetadata?.durationSec !== undefined && (
              <MetadataField
                label={t("assets.metadata.duration")}
                value={formatDuration(technicalMetadata.durationSec)}
              />
            )}
            {technicalMetadata?.width !== undefined && technicalMetadata.height !== undefined && (
              <MetadataField
                label={t("assets.metadata.dimensions")}
                value={`${technicalMetadata.width} × ${technicalMetadata.height}`}
              />
            )}
            {technicalMetadata?.codec && (
              <MetadataField label={t("assets.metadata.codec")} value={technicalMetadata.codec} />
            )}
            {technicalMetadata?.frameRate !== undefined && (
              <MetadataField
                label={t("assets.metadata.frameRate")}
                value={formatFrameRate(technicalMetadata.frameRate)}
              />
            )}
            {technicalMetadata?.bitRate !== undefined && (
              <MetadataField
                label={t("assets.metadata.bitRate")}
                value={formatBitRate(technicalMetadata.bitRate)}
              />
            )}
            {technicalMetadata?.sampleRate !== undefined && (
              <MetadataField
                label={t("assets.metadata.sampleRate")}
                value={`${technicalMetadata.sampleRate.toLocaleString()} Hz`}
              />
            )}
            {technicalMetadata?.channels !== undefined && (
              <MetadataField
                label={t("assets.metadata.channels")}
                value={t("assets.metadata.channelCount", { count: technicalMetadata.channels })}
              />
            )}
          </>
        ) : (
          <Typography component="p" sx={{ m: 0, color: "warning.main", fontSize: 14 }}>
            {t("assets.metadata.notFound")}
          </Typography>
        )}
        <MetadataField
          label={t("assets.metadata.usedBy")}
          value={t("assets.metadata.cueCount", { count: usages.length })}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.action.close")}</Button>
      </DialogActions>
    </Dialog>
  );
}

function MetadataField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography component="span" sx={inspectorFieldLabelSx}>
        {label}
      </Typography>
      <Typography component="p" sx={{ ...inspectorReadonlySx, overflowWrap: "anywhere" }}>
        {value}
      </Typography>
    </Box>
  );
}
