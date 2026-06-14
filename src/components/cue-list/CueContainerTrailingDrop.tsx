import Box from "@mui/material/Box";
import { useGscTokens } from "../../theme/useGscTokens";
import { cueDropZoneSx } from "./cueDropZoneSx";
import {
  type ContainerTrailingDropMode,
  useCueContainerTrailingDrop,
} from "./useCueContainerTrailingDrop";

interface CueContainerTrailingDropProps {
  canEdit: boolean;
  containerId: string;
  depth: number;
  mode: ContainerTrailingDropMode;
}

export function CueContainerTrailingDrop({
  canEdit,
  containerId,
  depth,
  mode,
}: CueContainerTrailingDropProps) {
  const tokens = useGscTokens();
  const { dropActive, onDragOver, onDragLeave, onDrop } = useCueContainerTrailingDrop(
    canEdit,
    containerId,
    mode,
  );

  return (
    <Box
      component="li"
      aria-hidden
      data-gsc-drop-zone={
        mode === "children-end" ? "cue-container-children-trailing" : "cue-container-exit-trailing"
      }
      data-container-id={containerId}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      sx={{
        ...cueDropZoneSx(tokens, dropActive, mode === "children-end" ? 14 : 10),
        pl: `${12 + depth * 16}px`,
      }}
    />
  );
}
