import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { getChildCues, isSequenceGroup } from "../lib/cues";
import { getPrimarySelectedCueId } from "../lib/cue-selection";
import { useActiveCueList, useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import type { Cue } from "../types/cue";
import { CueTypeBadge } from "./CueTypeIcon";
import {
  groupChildItemSx,
  groupChildNameSx,
  groupChildNumberSx,
  groupChildSelectSx,
  groupChildStepSx,
  groupChildrenListSx,
  inspectorFieldLabelSx,
  inspectorFieldSx,
  inspectorGroupHintSx,
  inspectorGroupLegendSx,
  inspectorGroupSx,
  inspectorHintSx,
} from "./inspectorSx";

interface ContainerInspectorFieldsProps {
  container: Cue;
}

export function ContainerInspectorFields({
  container,
}: ContainerInspectorFieldsProps) {
  const canEdit = !useUiStore((s) => s.showMode);
  const activeList = useActiveCueList();
  const cues = activeList.cues;
  const selectedCueId = getPrimarySelectedCueId(activeList.selectedCueIds);
  const selectCue = useProjectStore((s) => s.selectCue);
  const updateCue = useProjectStore((s) => s.updateCue);
  const moveCueToGroup = useProjectStore((s) => s.moveCueToGroup);
  const addSelectedCueToGroup = useProjectStore((s) => s.addSelectedCueToGroup);

  const children = getChildCues(cues, container.id);
  const isSequence = isSequenceGroup(container);
  const canAddSelected =
    selectedCueId &&
    selectedCueId !== container.id &&
    !children.some((c) => c.id === selectedCueId);

  return (
    <Box component="fieldset" sx={inspectorGroupSx}>
      <Box component="legend" sx={inspectorGroupLegendSx}>
        {isSequence ? "Sequence" : "Parallel group"}
      </Box>
      <Stack sx={{ ...inspectorFieldSx, gap: 0.75 }}>
        <Typography component="span" sx={inspectorFieldLabelSx}>
          Playback
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={isSequence ? "sequence" : "group"}
          disabled={!canEdit}
          aria-label="Container playback mode"
          onChange={(_, value: "group" | "sequence" | null) => {
            if (!canEdit || !value) return;
            updateCue(container.id, { type: value });
          }}
        >
          <ToggleButton value="group">Parallel</ToggleButton>
          <ToggleButton value="sequence">Sequential</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Typography component="p" sx={inspectorGroupHintSx}>
        {isSequence
          ? "Child cues run one after another when you GO this sequence. Each cue starts when the previous finishes (using In/Out duration until playback is wired up)."
          : "Child cues run at the same time when you GO this group. Drag cues onto the row in the list, or add the selected cue below."}
      </Typography>

      {canEdit && canAddSelected && (
        <Button
          variant="text"
          size="small"
          onClick={() => addSelectedCueToGroup(container.id)}
        >
          Add selected cue to {isSequence ? "sequence" : "group"}
        </Button>
      )}

      <Box component="ul" sx={groupChildrenListSx}>
        {children.length === 0 && (
          <Box component="li" sx={inspectorHintSx}>
            No cues in this {isSequence ? "sequence" : "group"} yet.
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
                title="Remove from container"
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
