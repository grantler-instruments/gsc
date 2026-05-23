import { useUiStore } from "../stores/ui";
import { editTokens, type GscTokenSet, showTokens } from "./tokens";

export function useGscTokens(): GscTokenSet {
  const showMode = useUiStore((s) => s.showMode);
  return showMode ? showTokens : editTokens;
}
