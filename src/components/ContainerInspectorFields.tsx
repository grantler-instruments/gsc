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
    <fieldset className="inspector-group">
      <legend className="inspector-group-legend">
        {isSequence ? "Sequence" : "Parallel group"}
      </legend>
      <Stack className="inspector-field" sx={{ gap: 0.75 }}>
        <Typography component="span" variant="caption" className="inspector-field-label">
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

      <Typography component="p" className="inspector-group-hint" variant="caption">
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

      <ul className="group-children-list">
        {children.length === 0 && (
          <li className="inspector-hint">
            No cues in this {isSequence ? "sequence" : "group"} yet.
          </li>
        )}
        {children.map((child, index) => (
          <li key={child.id} className="group-child-item">
            {isSequence && (
              <span className="group-child-step">{index + 1}</span>
            )}
            <button
              type="button"
              className="group-child-select"
              onClick={() => selectCue(child.id)}
            >
              <CueTypeBadge type={child.type} showLabel={false} />
              <span className="group-child-number">{child.number}</span>
              <span className="group-child-name">{child.name}</span>
            </button>
            {canEdit && (
              <IconButton
                size="small"
                title="Remove from container"
                onClick={() => moveCueToGroup(child.id, null)}
              >
                ↑
              </IconButton>
            )}
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
