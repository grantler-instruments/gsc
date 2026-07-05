import { useEffect, useRef } from "react";
import { saveProjectAsFile } from "../lib/project-file-actions";
import { shouldShowDraftSaveReminder } from "../lib/project-save-flow";
import { hasMeaningfulProjectContent } from "../lib/unsaved-project";
import { getPlatform } from "../platform";
import { useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { requestSaveProjectNowChoice } from "../stores/save-project-prompt";
import { useUiStore } from "../stores/ui";

const REMINDER_POLL_MS = 60 * 1000;

/** Set false to avoid interrupting rehearsals; draft banner remains the primary nudge. */
const DRAFT_SAVE_REMINDER_ENABLED = false;

/** Nudge draft projects toward Save As on a fixed interval. */
export function useDraftSaveReminder(): void {
  const isTemporaryRoot = useProjectLocationStore((s) => s.isTemporaryRoot);
  const showMode = useUiStore((s) => s.showMode);
  const projectName = useProjectStore((s) => s.name);
  const draftStartedAtRef = useRef<number | null>(null);
  const lastRemindedAtRef = useRef<number | null>(null);
  const promptingRef = useRef(false);

  useEffect(() => {
    if (!DRAFT_SAVE_REMINDER_ENABLED) {
      return;
    }
    if (getPlatform() !== "tauri" || !isTemporaryRoot || showMode) {
      draftStartedAtRef.current = null;
      lastRemindedAtRef.current = null;
      return;
    }

    if (draftStartedAtRef.current === null) {
      draftStartedAtRef.current = Date.now();
    }

    const tick = () => {
      if (
        promptingRef.current ||
        !useProjectLocationStore.getState().isTemporaryRoot ||
        useUiStore.getState().showMode ||
        !hasMeaningfulProjectContent()
      ) {
        return;
      }

      const draftStartedAt = draftStartedAtRef.current ?? Date.now();
      const now = Date.now();
      if (
        !shouldShowDraftSaveReminder({
          isDraft: true,
          now,
          draftStartedAt,
          lastRemindedAt: lastRemindedAtRef.current,
        })
      ) {
        return;
      }

      lastRemindedAtRef.current = now;
      promptingRef.current = true;
      void (async () => {
        try {
          const choice = await requestSaveProjectNowChoice(
            useProjectStore.getState().name || projectName,
          );
          if (choice === "save") {
            await saveProjectAsFile();
          }
        } finally {
          promptingRef.current = false;
        }
      })();
    };

    const intervalId = window.setInterval(tick, REMINDER_POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [isTemporaryRoot, showMode, projectName]);
}
