import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { ImportReport } from "../lib/qlab5/import-report";
import { hasImportIssues } from "../lib/qlab5/import-report";

interface Qlab5ImportReportDialogProps {
  open: boolean;
  projectName: string;
  report: ImportReport | null;
  onClose: () => void;
}

export function Qlab5ImportReportDialog({
  open,
  projectName,
  report,
  onClose,
}: Qlab5ImportReportDialogProps) {
  const { t } = useTranslation();
  if (!report) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("qlab5Import.reportTitle")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography color="text.secondary">
          {t("qlab5Import.reportIntro", {
            name: projectName,
            cueCount: report.importedCueCount,
            listCount: report.importedListCount,
          })}
        </Typography>

        {!hasImportIssues(report) ? (
          <Typography color="text.secondary">{t("qlab5Import.reportClean")}</Typography>
        ) : null}

        {report.skippedCues.length > 0 ? (
          <Box>
            <Typography variant="subtitle2">{t("qlab5Import.skippedTitle")}</Typography>
            <List dense disablePadding>
              {report.skippedCues.map((entry) => (
                <ListItem
                  key={`${entry.listName}:${entry.number}:${entry.type}:${entry.name}`}
                  disableGutters
                >
                  <ListItemText
                    primary={`${entry.number || "—"} ${entry.name} (${entry.type})`}
                    secondary={entry.reason}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        ) : null}

        {report.missingAssets.length > 0 ? (
          <Box>
            <Typography variant="subtitle2">{t("qlab5Import.missingAssetsTitle")}</Typography>
            <List dense disablePadding>
              {report.missingAssets.map((path) => (
                <ListItem key={path} disableGutters>
                  <ListItemText primary={path} />
                </ListItem>
              ))}
            </List>
          </Box>
        ) : null}

        {report.warnings.length > 0 ? (
          <Box>
            <Typography variant="subtitle2">{t("qlab5Import.warningsTitle")}</Typography>
            <List dense disablePadding>
              {report.warnings.map((warning) => (
                <ListItem key={warning.message} disableGutters>
                  <ListItemText primary={warning.message} />
                </ListItem>
              ))}
            </List>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          {t("common.action.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
