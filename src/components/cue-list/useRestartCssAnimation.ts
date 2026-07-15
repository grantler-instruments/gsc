import { type RefObject, useLayoutEffect } from "react";

/** Restarts CSS animations on an element when `token` changes. */
export function useRestartCssAnimation(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  token: string,
): void {
  useLayoutEffect(() => {
    void token;
    if (!active || !ref.current) return;
    const el = ref.current;
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = "";
  }, [active, token, ref]);
}
