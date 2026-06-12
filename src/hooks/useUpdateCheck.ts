import { useEffect, useRef } from "react";
import { checkForUpdate } from "../lib/check-for-update";
import { useProjectLoadingStore } from "../stores/project-loading";

/** Fetch GitHub tags after startup and notify when a newer version exists. */
export function useUpdateCheck(sessionReady: boolean): void {
  const projectLoading = useProjectLoadingStore((s) => s.active);
  const appReady = sessionReady && !projectLoading;
  const checked = useRef(false);

  useEffect(() => {
    if (!appReady || checked.current) return;
    checked.current = true;
    void checkForUpdate();
  }, [appReady]);
}
