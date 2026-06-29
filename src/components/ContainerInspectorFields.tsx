import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { getCueTypeLabel } from "../i18n/cueTypeLabels";
import { getPrimarySelectedCueId } from "../lib/cue-selection";
import { getChildCues, isSequenceGroup } from "../lib/cues";
import { useActiveCueList, useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import type { Cue } from "../types/cue";
import { CueTypeBadge } from "./CueTypeIcon";
import {
  groupChildItemSx,
  groupChildNameSx,
  groupChildNumberSx,
  groupChildrenListSx,
  groupChildSelectSx,
  groupChildStepSx,
  inspectorFieldLabelSx,
  inspectorFieldSx,
  inspectorGroupHintSx,
  inspectorGroupLegendSx,
  inspectorGroupSx,
  inspectorHintSx,
  inspectorToggleGroupSx,
} from "./inspectorSx";

interface ContainerInspectorFieldsProps {
  container: Cue;
}

export function ContainerInspectorFields({ container }: ContainerInspectorFieldsProps) {
  const { t } = useTranslation();
  const canEdit = !useUiStore((s) => s.showMode);
  const activeList = useActiveCueList();
  const cues = activeList.cues;
  const selectedCueId = getPrimarySelectedCueId(activeList.selectedCueIds);
  const selectCue = useProjectStore((s) => s.selectCue);
  const updateCue = useProjectStore((s) => s.updateCue);
  const moveCueToGroup = useProjectStore((s) => s.moveCueToGroup);
  const addSelectedCueToGroup = useProjectStore((s) => s.addSelectedCueToGroup);
  const ungroupCue = useProjectStore((s) => s.ungroupCue);
  const addCue = useProjectStore((s) => s.addCue);

  const children = getChildCues(cues, container.id);
  const isSequence = isSequenceGroup(container);
  const canAddSelected =
    selectedCueId &&
    selectedCueId !== container.id &&
    !children.some((c) => c.id === selectedCueId);

  return (
    <Box component="fieldset" sx={inspectorGroupSx}>
      <Box component="legend" sx={inspectorGroupLegendSx}>
        {isSequence ? t("inspector.sequence") : t("inspector.parallelGroup")}
      </Box>
      <Stack sx={{ ...inspectorFieldSx, gap: 0.75 }}>
        <Typography component="span" sx={inspectorFieldLabelSx}>
          {t("inspector.playback")}
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          sx={inspectorToggleGroupSx}
          value={isSequence ? "sequence" : "group"}
          disabled={!canEdit}
          aria-label={t("inspector.containerModeAria")}
          onChange={(_, value: "group" | "sequence" | null) => {
            if (!canEdit || !value) return;
            updateCue(container.id, { type: value });
          }}
        >
          <ToggleButton value="group">{getCueTypeLabel("group")}</ToggleButton>
          <ToggleButton value="sequence">{t("cueType.sequential")}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Typography component="p" sx={inspectorGroupHintSx}>
        {isSequence ? t("inspector.sequenceHint") : t("inspector.parallelHint")}
      </Typography>

      {canEdit && canAddSelected && (
        <Button variant="text" size="small" onClick={() => addSelectedCueToGroup(container.id)}>
          {t("inspector.addSelectedToContainer")}
        </Button>
      )}

      {canEdit && (
        <Button variant="text" size="small" onClick={() => ungroupCue(container.id)}>
          {t("inspector.ungroupContainer")}
        </Button>
      )}

      {canEdit && isSequence && (
        <Button
          variant="text"
          size="small"
          onClick={() =>
            addCue({ name: getCueTypeLabel("wait"), type: "wait", parentId: container.id })
          }
        >
          {t("inspector.addWaitStep")}
        </Button>
      )}

      <Box component="ul" sx={groupChildrenListSx}>
        {children.length === 0 && (
          <Box component="li" sx={inspectorHintSx}>
            {t("inspector.noCuesInContainer")}
          </Box>
        )}
        {children.map((child, index) => (
          <Box component="li" key={child.id} sx={groupChildItemSx}>
            {isSequence && (
              <Box component="span" sx={groupChildStepSx}>
                {index + 1}
              </Box>
            )}
            <Box
              component="button"
              type="button"
              sx={groupChildSelectSx}
              onClick={() => selectCue(child.id)}
            >
              <CueTypeBadge type={child.type} showLabel={false} />
              <Box component="span" sx={groupChildNumberSx}>
                {child.number}
              </Box>
              <Box component="span" sx={groupChildNameSx}>
                {child.name}
              </Box>
            </Box>
            {canEdit && (
              <IconButton
                size="small"
                title={t("inspector.removeFromContainer")}
                onClick={() => moveCueToGroup(child.id, null)}
              >
                ↑
              </IconButton>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
