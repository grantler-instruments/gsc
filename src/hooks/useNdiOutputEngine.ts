import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getNdiOutputStatus, startNdiOutput, stopNdiOutput } from "../platform/ndi";
import { isOutputMode } from "../platform/output-window";
import { usePreferencesStore } from "../stores/preferences";
import {
  DEFAULT_NDI_OUTPUT_FPS,
  DEFAULT_NDI_OUTPUT_HEIGHT,
  DEFAULT_NDI_OUTPUT_WIDTH,
  NDI_ENABLED,
  type NdiOutputConfig,
} from "../types/ndi";

function buildConfig(
  sourceName: string,
  windowTitle: string,
  width: number,
  height: number,
  fps: number,
): NdiOutputConfig {
  return {
    sourceName: sourceName.trim(),
    windowTitle,
    width: width || DEFAULT_NDI_OUTPUT_WIDTH,
    height: height || DEFAULT_NDI_OUTPUT_HEIGHT,
    fps: fps || DEFAULT_NDI_OUTPUT_FPS,
  };
}

/** Starts and stops the native NDI program output sender from preferences. */
export function useNdiOutputEngine(): void {
  const { t } = useTranslation();
  const configRef = useRef<NdiOutputConfig | null>(null);

  const ndiOutputEnabled = usePreferencesStore((s) => s.ndiOutputEnabled);
  const ndiSourceName = usePreferencesStore((s) => s.ndiSourceName);
  const ndiOutputWidth = usePreferencesStore((s) => s.ndiOutputWidth);
  const ndiOutputHeight = usePreferencesStore((s) => s.ndiOutputHeight);
  const ndiOutputFps = usePreferencesStore((s) => s.ndiOutputFps);

  useEffect(() => {
    if (!NDI_ENABLED || isOutputMode()) return;

    let cancelled = false;

    const sync = async () => {
      if (cancelled) return;

      if (!ndiOutputEnabled) {
        configRef.current = null;
        await stopNdiOutput();
        return;
      }

      const nextConfig = buildConfig(
        ndiSourceName,
        t("common.brand.outputWindowTitle"),
        ndiOutputWidth,
        ndiOutputHeight,
        ndiOutputFps,
      );

      const prev = configRef.current;
      const unchanged =
        prev &&
        prev.sourceName === nextConfig.sourceName &&
        prev.windowTitle === nextConfig.windowTitle &&
        prev.width === nextConfig.width &&
        prev.height === nextConfig.height &&
        prev.fps === nextConfig.fps;

      if (unchanged) {
        const status = await getNdiOutputStatus();
        if (!cancelled && status.running) return;
      }

      configRef.current = nextConfig;
      await stopNdiOutput();
      if (cancelled) return;
      await startNdiOutput(nextConfig);
    };

    void sync().catch((err) => {
      console.warn("[ndi] output engine failed", err);
    });

    return () => {
      cancelled = true;
      void stopNdiOutput();
    };
  }, [ndiOutputEnabled, ndiSourceName, ndiOutputWidth, ndiOutputHeight, ndiOutputFps, t]);
}
