import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { isDmxPreviewableCue } from "../../lib/dmx-preview";
import { useDmxPreviewSessionStore } from "../../stores/dmx-preview-session";
import { useActiveCueList, useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import { CUE_TYPE_COLORS } from "../../theme/cueStyles";
import type { Cue } from "../../types/cue";
import { inspectorHintSx } from "../inspectorSx";

interface DmxPreviewFieldProps {
  cue: Cue;
  readOnly: boolean;
  dmxDisabled: boolean;
}

const previewIdleSx = {
  borderColor: "divider",
  color: "text.primary",
  "&:hover": {
    borderColor: CUE_TYPE_COLORS.dmx.color,
    bgcolor: "rgba(242, 208, 114, 0.08)",
  },
} as const;

export function DmxPreviewField({ cue, readOnly, dmxDisabled }: DmxPreviewFieldProps) {
  const { t } = useTranslation();
  const fixtures = useProjectStore((s) => s.fixtures);
  const cues = useActiveCueList().cues;
  const previewActive = useUiStore((s) => s.dmxPreviewCueIds.includes(cue.id));
  const requestActivatePreview = useDmxPreviewSessionStore((s) => s.requestActivatePreview);
  const requestDeactivatePreview = useDmxPreviewSessionStore((s) => s.requestDeactivatePreview);
  const confirmOpen = useDmxPreviewSessionStore((s) => s.confirm?.cueId === cue.id);

  const previewable = isDmxPreviewableCue(cue, fixtures, cues);
  const active = previewActive && previewable;
  const locked = readOnly || dmxDisabled || !previewable || confirmOpen;

  let hint: string | null = null;
  if (fixtures.length === 0) {
    hint = t("inspector.previewPatchHint");
  } else if (!previewable) {
    hint = t("inspector.previewAddLevelsHint");
  } else if (dmxDisabled) {
    hint = t("inspector.previewDesktopHint");
  } else if (active) {
    hint = t("inspector.previewSnapshotHint");
  }

  const handleClick = () => {
    if (active) {
      requestDeactivatePreview(cue.id);
      return;
    }
    requestActivatePreview(cue.id);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Button
        fullWidth
        size="large"
        variant={active ? "contained" : "outlined"}
        color={active ? "primary" : "inherit"}
        disabled={locked}
        startIcon={<LightbulbOutlinedIcon />}
        aria-pressed={active}
        onClick={handleClick}
        sx={{
          py: 1.25,
          justifyContent: "center",
          textTransform: "none",
          letterSpacing: "normal",
          fontSize: 14,
          fontWeight: active ? 600 : 400,
          ...(active ? {} : previewIdleSx),
        }}
      >
        {active ? t("inspector.previewingOnDmx") : t("inspector.previewOnDmx")}
      </Button>

      {hint && (
        <Typography component="p" sx={inspectorHintSx}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}
