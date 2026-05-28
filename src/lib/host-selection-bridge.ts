/** Host selection change hook, registered from useRemoteHost to avoid store import cycles. */

let broadcastSelection: (() => void) | null = null;

export function registerHostSelectionBroadcaster(fn: () => void): () => void {
  broadcastSelection = fn;
  return () => {
    if (broadcastSelection === fn) broadcastSelection = null;
  };
}

export function syncHostSelectionToRemotes(): void {
  broadcastSelection?.();
}
