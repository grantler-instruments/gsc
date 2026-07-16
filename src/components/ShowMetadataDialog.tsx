import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { saveProjectAsFile } from "../lib/project-file-actions";
import {
  runAfterShowMetadataSave,
  shouldPromptSaveProjectAfterMetadata,
} from "../lib/project-save-flow";
import { getPlatform } from "../platform";
import { useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { requestSaveProjectNowChoice } from "../stores/save-project-prompt";
import { inspectorFieldLabelSx, inspectorReadonlySx } from "./inspectorSx";

interface ShowMetadataDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ShowMetadataDialog({ open, onClose }: ShowMetadataDialogProps) {
  const { t } = useTranslation();
  const storeName = useProjectStore((s) => s.name);
  const storeStartDate = useProjectStore((s) => s.startDate);
  const storeEndDate = useProjectStore((s) => s.endDate);
  const storeDescription = useProjectStore((s) => s.description);
  const setShowMetadata = useProjectStore((s) => s.setShowMetadata);
  const rootDir = useProjectLocationStore((s) => s.rootDir);
  const isTemporaryRoot = useProjectLocationStore((s) => s.isTemporaryRoot);
  const isDesktop = getPlatform() === "tauri";

  const locationLabel = isDesktop
    ? isTemporaryRoot
      ? t("project.metadata.locationDraft")
      : rootDir
    : t("project.metadata.locationWeb");

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setName(storeName);
      setStartDate(storeStartDate ?? "");
      setEndDate(storeEndDate ?? "");
      setDescription(storeDescription ?? "");
    }
  }, [open, storeName, storeStartDate, storeEndDate, storeDescription]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setShowMetadata({
      name: trimmedName,
      startDate: startDate.trim() || undefined,
      endDate: endDate.trim() || undefined,
      description: description.trim() || undefined,
    });
    onClose();

    void runAfterShowMetadataSave({
      shouldPrompt: shouldPromptSaveProjectAfterMetadata({
        platform: getPlatform(),
        isTemporaryRoot,
      }),
      projectName: trimmedName,
      requestSaveProjectNow: requestSaveProjectNowChoice,
      saveProjectAs: saveProjectAsFile,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("project.metadata.title")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <TextField
          label={t("project.metadata.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          autoFocus
          required
        />
        <Box>
          <Typography component="span" sx={inspectorFieldLabelSx}>
            {t("project.metadata.location")}
          </Typography>
          <Typography
            component="p"
            sx={{
              ...inspectorReadonlySx,
              wordBreak: "break-all",
              ...(isDesktop && isTemporaryRoot
                ? { color: "text.secondary", fontStyle: "italic" }
                : {}),
            }}
            title={rootDir && !isTemporaryRoot ? rootDir : undefined}
          >
            {locationLabel}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label={t("project.metadata.startDate")}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label={t("project.metadata.endDate")}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>
        <TextField
          label={t("project.metadata.description")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          minRows={3}
          maxRows={6}
          placeholder={t("project.metadata.descriptionPlaceholder")}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.action.cancel")}</Button>
        <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
          {t("common.action.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
