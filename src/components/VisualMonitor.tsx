import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useVisualOutputLayers } from "../hooks/useVisualOutputLayers";
import { VisualStage } from "./VisualStage";

interface VisualMonitorProps {
  className?: string;
}

/** Live preview monitor for active video/image cues. */
export function VisualMonitor({ className }: VisualMonitorProps) {
  const layers = useVisualOutputLayers();

  return (
    <Box
      className={["visual-monitor", className].filter(Boolean).join(" ")}
      sx={{
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
        role="control"
        className="visual-monitor-stage"
      />
    </Box>
  );
}
