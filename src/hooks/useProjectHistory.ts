import { useEffect } from "react";
import { subscribeProjectHistory } from "../lib/project-history";

/** Record project edits for undo/redo. Asset imports are not tracked. */
export function useProjectHistory(): void {
  useEffect(() => subscribeProjectHistory(), []);
}
