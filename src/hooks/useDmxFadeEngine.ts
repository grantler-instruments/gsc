import { useEffect } from "react";
import { sampleDmxFadePlan } from "../lib/dmx-fade";
import { finalizeLightFade } from "../lib/trigger-fade";
import { sendDmxUniverses } from "../platform/send-dmx";
import { getDmxFadeProgress, isDmxFadeComplete, useFadeStore } from "../stores/fade";

/** Drives active DMX fades each frame and sends Art-Net output. */
export function useDmxFadeEngine(): void {
  useEffect(() => {
    let rafId = 0;

    const loop = () => {
      const nowMs = performance.now();
      const { dmxFadesByFadeCueId, completeDmxFade } = useFadeStore.getState();
      const fades = Object.values(dmxFadesByFadeCueId);

      if (fades.length > 0) {
        for (const fade of fades) {
          const progress = getDmxFadeProgress(fade, nowMs);
          const frames = sampleDmxFadePlan(
            fade.plan,
            isDmxFadeComplete(fade, nowMs) ? 1 : progress,
          );
          void sendDmxUniverses(frames);

          if (isDmxFadeComplete(fade, nowMs)) {
            finalizeLightFade(fade.endDmx);
            completeDmxFade(fade.fadeCueId, nowMs);
          } else {
            useFadeStore.setState({ frameMs: nowMs });
          }
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);
}
