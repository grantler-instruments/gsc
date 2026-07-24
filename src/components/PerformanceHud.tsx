import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getProcessStats } from "../platform/performance-stats";
import { usePreferencesStore } from "../stores/preferences";

const STATS_POLL_MS = 1000;
const FPS_WINDOW_MS = 500;

const metricSx = {
  cursor: "default",
} as const;

export function PerformanceHud() {
  const { t } = useTranslation();
  const enabled = usePreferencesStore((s) => s.performanceHudEnabled);
  const [fps, setFps] = useState<number | null>(null);
  const [cpuPercent, setCpuPercent] = useState<number | null>(null);
  const [memoryMb, setMemoryMb] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setFps(null);
      return;
    }

    let frameCount = 0;
    let windowStart = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      frameCount += 1;
      const elapsed = now - windowStart;
      if (elapsed >= FPS_WINDOW_MS) {
        setFps((frameCount * 1000) / elapsed);
        frameCount = 0;
        windowStart = now;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCpuPercent(null);
      setMemoryMb(null);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const stats = await getProcessStats();
        if (cancelled) return;
        if (stats) {
          setCpuPercent(stats.cpuPercent);
          setMemoryMb(stats.memoryMb);
        } else {
          setCpuPercent(null);
          setMemoryMb(null);
        }
      } catch {
        if (!cancelled) {
          setCpuPercent(null);
          setMemoryMb(null);
        }
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), STATS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);

  if (!enabled) return null;

  const fpsLabel = fps === null ? "— FPS" : `${Math.round(fps)} FPS`;
  const cpuLabel = cpuPercent === null ? "—" : `${Math.round(cpuPercent)}%`;
  const ramLabel = memoryMb === null ? "—" : `${Math.round(memoryMb)} MB`;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        flexShrink: 0,
        color: "text.secondary",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 11,
        lineHeight: 1.3,
        letterSpacing: 0.2,
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      <Tooltip title={t("settings.performanceHudFpsTooltip")} arrow>
        <Box component="span" sx={metricSx}>
          {fpsLabel}
        </Box>
      </Tooltip>
      <Box component="span" aria-hidden>
        ·
      </Box>
      <Tooltip title={t("settings.performanceHudCpuTooltip")} arrow>
        <Box component="span" sx={metricSx}>
          {cpuLabel}
        </Box>
      </Tooltip>
      <Box component="span" aria-hidden>
        ·
      </Box>
      <Tooltip title={t("settings.performanceHudRamTooltip")} arrow>
        <Box component="span" sx={metricSx}>
          {ramLabel}
        </Box>
      </Tooltip>
    </Box>
  );
}
