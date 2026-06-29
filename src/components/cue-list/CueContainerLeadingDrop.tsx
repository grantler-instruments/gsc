import Box from "@mui/material/Box";
import { useGscTokens } from "../../theme/useGscTokens";
import { cueDropZoneSx } from "./cueDropZoneSx";
import { useCueContainerLeadingDrop } from "./useCueContainerLeadingDrop";

interface CueContainerLeadingDropProps {
  canEdit: boolean;
  containerId: string;
  firstChildId: string;
  depth: number;
}

export function CueContainerLeadingDrop({
  canEdit,
  containerId,
  firstChildId,
  depth,
}: CueContainerLeadingDropProps) {
  const tokens = useGscTokens();
  const { dropActive, onDragOver, onDragLeave, onDrop } = useCueContainerLeadingDrop(
    canEdit,
    containerId,
    firstChildId,
  );

  return (
    <Box
      component="li"
      aria-hidden
      data-gsc-drop-zone="cue-container-leading"
      data-container-id={containerId}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      sx={{
        ...cueDropZoneSx(tokens, dropActive, 14),
        pl: `${12 + depth * 16}px`,
      }}
    />
  );
}
