import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { openOutputWindow } from "../platform/output-window";
import { useProjectStore } from "../stores/project";
import { isVisualCueType } from "../stores/project/helpers";

export function OpenOutputButton() {
  const { t } = useTranslation();
  const hasVisualCues = useProjectStore((s) =>
    s.cueLists.some((list) => list.cues.some((cue) => isVisualCueType(cue.type))),
  );
  const [error, setError] = useState<string | null>(null);

  const handleOpen = useCallback(async () => {
    setError(null);
    try {
      await openOutputWindow();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message.includes("Allow popups") ? t("output.popupBlocked") : t("output.openFailed"),
      );
    }
  }, [t]);

  if (!hasVisualCues) {
    return null;
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<OpenInNewIcon fontSize="small" />}
        onClick={handleOpen}
        aria-label={t("output.button")}
        title={t("output.openWindowTitle")}
        data-gsc-action="open-output"
        sx={{ minWidth: 148 }}
      >
        {t("output.button")}
      </Button>
      {error && (
        <Typography
          component="span"
          variant="caption"
          color="error"
          title={error}
          noWrap
          sx={{ maxWidth: 200 }}
        >
          {error}
        </Typography>
      )}
    </>
  );
}
