export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return !!target.closest("input, textarea, select, [contenteditable='true']");
}

export function hasTextSelection(): boolean {
  if (typeof window === "undefined") return false;
  const selection = window.getSelection();
  return selection != null && selection.toString().length > 0;
}

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform =
    "userAgentData" in navigator
      ? (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform
      : undefined;
  return (
    platform === "macOS" ||
    /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ||
    /Mac OS X/i.test(navigator.userAgent)
  );
}

/** Human-readable shortcut label, e.g. ⌘C on macOS or Ctrl+C elsewhere. */
export function formatShortcut(key: string, shift = false): string {
  const letter = key.length === 1 ? key.toUpperCase() : key;
  if (isMacPlatform()) {
    return `${shift ? "⇧" : ""}⌘${letter}`;
  }
  return `${shift ? "Shift+" : ""}Ctrl+${letter}`;
}
