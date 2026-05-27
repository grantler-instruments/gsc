import Box from "@mui/material/Box";
import { useEffect, useRef } from "react";
import { useMediaWaveform } from "../hooks/useMediaWaveform";
import { drawCompactWaveform, readCompactWaveformColors } from "../lib/waveform-draw";

interface TransportWaveformThumbProps {
  assetPath: string;
  height: number;
}

export function TransportWaveformThumb({ assetPath, height }: TransportWaveformThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data, loading } = useMediaWaveform(assetPath, "audio");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const colors = readCompactWaveformColors(canvas);
    drawCompactWaveform(canvas, data.peaks, height, colors.wave, colors.track);
  }, [data, height]);

  return (
    <Box
      component="canvas"
      ref={canvasRef}
      aria-hidden
      sx={{
        display: "block",
        width: "100%",
        height: "100%",
        opacity: loading ? 0.45 : 1,
      }}
    />
  );
}
