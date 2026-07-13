import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";
import { saveProjectAsFile } from "../lib/project-file-actions";
import { getPlatform } from "../platform";
import { useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { useUiStore } from "../stores/ui";

export function DraftProjectBanner() {
  const { t } = useTranslation();
  const isTemporaryRoot = useProjectLocationStore((s) => s.isTemporaryRoot);
  const showMode = useUiStore((s) => s.showMode);
  const hasCueListContent = useProjectStore((s) => s.cueLists.some((list) => list.cues.length > 0));

  if (getPlatform() !== "tauri" || !isTemporaryRoot || showMode || !hasCueListContent) {
    return null;
  }

  return (
    <Alert
      severity="warning"
      sx={{
        borderRadius: 0,
        flexShrink: 0,
        "& .MuiAlert-message": { flex: 1 },
      }}
      action={
        <Button
          color="inherit"
          size="small"
          startIcon={<SaveOutlinedIcon />}
          onClick={() => void saveProjectAsFile()}
        >
          {t("project.draftBanner.saveAs")}
        </Button>
      }
    >
      {t("project.draftBanner.message")}
    </Alert>
  );
}
