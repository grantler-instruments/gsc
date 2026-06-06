import { useEffect } from "react";
import { setKeepAwake } from "../platform/keep-awake";
import { useUiStore } from "../stores/ui";

/** Prevent idle/sleep while show mode is active. */
export function useShowModeKeepAwake(): void {
  const showMode = useUiStore((s) => s.showMode);

  useEffect(() => {
    void setKeepAwake(showMode);
    return () => {
      void setKeepAwake(false);
    };
  }, [showMode]);
}
