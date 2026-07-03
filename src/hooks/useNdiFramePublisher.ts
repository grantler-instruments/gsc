import { useEffect, useRef } from "react";
import { captureOutputStageFrame } from "../lib/ndi-capture";
import { getNdiOutputStatus, pushNdiFrame } from "../platform/ndi";
import {
  DEFAULT_NDI_OUTPUT_FPS,
  DEFAULT_NDI_OUTPUT_HEIGHT,
  DEFAULT_NDI_OUTPUT_WIDTH,
  NDI_ENABLED,
} from "../types/ndi";

/** Pushes composited output-window frames to the Rust NDI sender. */
export function useNdiFramePublisher(): void {
  const activeRef = useRef(false);
  const widthRef = useRef(DEFAULT_NDI_OUTPUT_WIDTH);
  const heightRef = useRef(DEFAULT_NDI_OUTPUT_HEIGHT);
  const fpsRef = useRef(DEFAULT_NDI_OUTPUT_FPS);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!NDI_ENABLED) return;

    let cancelled = false;
    let rafId = 0;
    let lastPushMs = 0;

    const refreshStatus = async () => {
      try {
        const status = await getNdiOutputStatus();
        if (cancelled) return;
        activeRef.current = status.running;
        widthRef.current = status.width || DEFAULT_NDI_OUTPUT_WIDTH;
        heightRef.current = status.height || DEFAULT_NDI_OUTPUT_HEIGHT;
        fpsRef.current = status.fps || DEFAULT_NDI_OUTPUT_FPS;
      } catch {
        activeRef.current = false;
      }
    };

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (!activeRef.current || inFlightRef.current) return;

      const fps = Math.max(1, fpsRef.current);
      const minIntervalMs = 1000 / fps;
      if (now - lastPushMs < minIntervalMs) return;

      const width = widthRef.current;
      const height = heightRef.current;
      const frame = captureOutputStageFrame(width, height);
      if (!frame) return;

      inFlightRef.current = true;
      lastPushMs = now;
      void pushNdiFrame(width, height, frame)
        .catch((err) => {
          console.warn("[ndi] push frame failed", err);
        })
        .finally(() => {
          inFlightRef.current = false;
        });
    };

    void refreshStatus();
    const statusTimer = window.setInterval(() => {
      void refreshStatus();
    }, 500);

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.clearInterval(statusTimer);
    };
  }, []);
}
