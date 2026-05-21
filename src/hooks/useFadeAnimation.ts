import { useEffect } from "react";
import { useFadeStore } from "../stores/fade";

/** Drives active property fades (opacity/volume) each frame. */
export function useFadeAnimation(): void {
  useEffect(() => {
    let rafId = 0;

    const loop = () => {
      const { fadesByTargetId, tick } = useFadeStore.getState();
      if (Object.keys(fadesByTargetId).length > 0) {
        tick(performance.now());
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);
}
