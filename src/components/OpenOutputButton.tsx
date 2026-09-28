import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { openOutputWindow } from "../platform/output-window";
import { useProjectStore } from "../stores/project";
import { isVisualCueType } from "../stores/project/helpers";
import { MASTER_VIDEO_OUTPUT_ID } from "../types/video-output";

export function OpenOutputButton() {
  const { t } = useTranslation();
  const hasVisualCues = useProjectStore((s) =>
    s.cueLists.some((list) => list.cues.some((cue) => isVisualCueType(cue.type))),
  );
  const videoOutputs = useProjectStore((s) => s.videoOutputs);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const menuOpen = Boolean(menuAnchor);
  const hasOutputMenu = videoOutputs.length > 1;

  const primaryOutput = useMemo(
    () => videoOutputs.find((output) => output.id === MASTER_VIDEO_OUTPUT_ID) ?? videoOutputs[0],
    [videoOutputs],
  );

  const openTarget = useCallback(
    async (outputId: string, outputName: string) => {
      setError(null);
      setMenuAnchor(null);
      try {
        await openOutputWindow({ outputId, outputName });
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        setError(
          message.includes("Allow popups") ? t("output.popupBlocked") : t("output.openFailed"),
        );
      }
    },
    [t],
  );

  const handlePrimaryOpen = useCallback(async () => {
    if (!primaryOutput) return;
    await openTarget(primaryOutput.id, primaryOutput.name);
  }, [openTarget, primaryOutput]);

  if (!hasVisualCues || !primaryOutput) {
    return null;
  }

  return (
    <>
      <ButtonGroup variant="outlined" size="small" sx={{ minWidth: 148 }}>
        <Button
          startIcon={<OpenInNewIcon fontSize="small" />}
          onClick={handlePrimaryOpen}
          aria-label={t("output.button")}
          title={t("output.openWindowTitle")}
          data-gsc-action="open-output"
        >
          {t("output.button")}
        </Button>
        {hasOutputMenu && (
          <Button
            size="small"
            aria-label={t("videoOutput.chooseOutput")}
            aria-haspopup="menu"
            aria-expanded={menuOpen ? "true" : undefined}
            onClick={(event) => setMenuAnchor(event.currentTarget)}
            sx={{ px: 0.75, minWidth: 0 }}
          >
            <ArrowDropDownIcon fontSize="small" />
          </Button>
        )}
      </ButtonGroup>

      {hasOutputMenu && (
        <Menu anchorEl={menuAnchor} open={menuOpen} onClose={() => setMenuAnchor(null)}>
          {videoOutputs.map((output) => (
            <MenuItem key={output.id} onClick={() => void openTarget(output.id, output.name)}>
              {output.name}
            </MenuItem>
          ))}
        </Menu>
      )}

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
