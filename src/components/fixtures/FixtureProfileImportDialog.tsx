import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

interface FixtureProfileImportDialogProps {
  open: boolean;
  profileName?: string;
  importedCount: number;
  existingCount: number;
  hasPlot: boolean;
  onCancel: () => void;
  onMerge: () => void;
  onReplace: () => void;
}

export function FixtureProfileImportDialog({
  open,
  profileName,
  importedCount,
  existingCount,
  hasPlot,
  onCancel,
  onMerge,
  onReplace,
}: FixtureProfileImportDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{t("fixtures.importProfileTitle")}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          {t("fixtures.importProfileMessage", {
            name: profileName || t("fixtures.importProfileUntitled"),
            count: importedCount,
          })}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {t("fixtures.importProfileExisting", { count: existingCount })}
        </Typography>
        {hasPlot && (
          <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
            {t("fixtures.importProfileIncludesPlot")}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onCancel}>{t("common.action.cancel")}</Button>
        <Button onClick={onMerge}>{t("fixtures.importProfileMerge")}</Button>
        <Button variant="contained" color="warning" onClick={onReplace}>
          {t("fixtures.importProfileReplace")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
