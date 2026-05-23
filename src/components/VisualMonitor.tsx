import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useVisualOutputLayers } from "../hooks/useVisualOutputLayers";
import { VisualStage } from "./VisualStage";

interface VisualMonitorProps {
  /** Sidebar layout: 16:9 stage that sizes to panel width. */
  variant?: "default" | "sidebar";
}

/** Live preview monitor for active video/image cues. */
export function VisualMonitor({ variant = "default" }: VisualMonitorProps) {
  const layers = useVisualOutputLayers();
  const sidebar = variant === "sidebar";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ px: 1.5, py: 0.5, display: "block" }}
      >
        Preview
      </Typography>
      <VisualStage
        layers={layers}
        stageRole="control"
        sx={{
          height: sidebar ? "auto" : 200,
          ...(sidebar && { aspectRatio: "16 / 9", minHeight: 0 }),
        }}
      />
    </Box>
  );
}
