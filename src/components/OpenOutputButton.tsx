import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { openOutputWindow, openVideoBusOutputWindow } from "../platform/output-window";
import { useProjectStore } from "../stores/project";
import { isVisualCueType } from "../stores/project/helpers";

export function OpenOutputButton() {
  const { t } = useTranslation();
  const hasVisualCues = useProjectStore((s) =>
    s.cueLists.some((list) => list.cues.some((cue) => isVisualCueType(cue.type))),
  );
  const videoBuses = useProjectStore((s) => s.videoBuses);
  const masterVideoOutputName = useProjectStore((s) => s.masterVideoOutputName);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const menuOpen = Boolean(menuAnchor);
  const hasBusMenu = videoBuses.length > 0;

  const openTargets = useMemo(
    () => [{ id: undefined as string | undefined, name: masterVideoOutputName }, ...videoBuses],
    [masterVideoOutputName, videoBuses],
  );

  const openTarget = useCallback(
    async (busId?: string, busName?: string) => {
      setError(null);
      setMenuAnchor(null);
      try {
        if (busId) {
          await openVideoBusOutputWindow(busId, busName ?? "");
        } else {
          await openOutputWindow({ busName: busName ?? masterVideoOutputName });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        setError(
          message.includes("Allow popups") ? t("output.popupBlocked") : t("output.openFailed"),
        );
      }
    },
    [masterVideoOutputName, t],
  );

  const handlePrimaryOpen = useCallback(async () => {
    await openTarget(undefined);
  }, [openTarget]);

  if (!hasVisualCues) {
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
        {hasBusMenu && (
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

      {hasBusMenu && (
        <Menu anchorEl={menuAnchor} open={menuOpen} onClose={() => setMenuAnchor(null)}>
          {openTargets.map((target) => (
            <MenuItem
              key={target.id ?? "master"}
              onClick={() => void openTarget(target.id, target.name)}
            >
              {target.name}
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
