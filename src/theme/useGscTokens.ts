import { useUiStore } from "../stores/ui";
import { editTokens, showTokens, type GscTokenSet } from "./tokens";

export function useGscTokens(): GscTokenSet {
  const showMode = useUiStore((s) => s.showMode);
  return showMode ? showTokens : editTokens;
}
