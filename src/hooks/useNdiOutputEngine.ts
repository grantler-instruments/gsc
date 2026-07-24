import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getNdiOutputStatus, startNdiOutput, stopNdiOutput } from "../platform/ndi";
import { isOutputMode, openOutputWindow } from "../platform/output-window";
import { usePreferencesStore } from "../stores/preferences";
import { useProjectStore } from "../stores/project";
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

/**
 * Starts and stops the native NDI program output sender.
 * Prefers a project VideoOutput with kind "ndi" (bus patch + source name);
 * falls back to preferences + master window title when none exist.
 */
export function useNdiOutputEngine(): void {
  const { t } = useTranslation();
  const configRef = useRef<NdiOutputConfig | null>(null);

  const ndiOutputEnabled = usePreferencesStore((s) => s.ndiOutputEnabled);
  const ndiSourceName = usePreferencesStore((s) => s.ndiSourceName);
  const ndiOutputWidth = usePreferencesStore((s) => s.ndiOutputWidth);
  const ndiOutputHeight = usePreferencesStore((s) => s.ndiOutputHeight);
  const ndiOutputFps = usePreferencesStore((s) => s.ndiOutputFps);
  const videoOutputs = useProjectStore((s) => s.videoOutputs);
  const ndiOutput = videoOutputs.find((o) => o.kind === "ndi");

  useEffect(() => {
    if (!NDI_ENABLED || isOutputMode()) return;

    let cancelled = false;

    const sync = async () => {
      if (cancelled) return;

      const enabled = ndiOutputEnabled;

      if (!enabled) {
        configRef.current = null;
        await stopNdiOutput();
        return;
      }

      const sourceName = ndiOutput?.name?.trim() || ndiSourceName;
      const windowTitle = ndiOutput
        ? t("videoOutput.windowTitleNamed", { name: ndiOutput.name })
        : t("common.brand.outputWindowTitle");

      if (ndiOutput) {
        try {
          await openOutputWindow({
            outputId: ndiOutput.id,
            outputName: ndiOutput.name,
            focus: false,
          });
        } catch (err) {
          console.warn("[ndi] failed to open capture window", err);
        }
      }

      const nextConfig = buildConfig(
        sourceName,
        windowTitle,
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
  }, [
    ndiOutputEnabled,
    ndiSourceName,
    ndiOutputWidth,
    ndiOutputHeight,
    ndiOutputFps,
    ndiOutput,
    t,
  ]);
}
