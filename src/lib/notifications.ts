import { type NotificationSeverity, useNotificationsStore } from "../stores/notifications";

const dedupeUntil = new Map<string, number>();
const DEFAULT_DEDUPE_MS = 8_000;

/** @internal */
export function resetNotificationDedupeForTests(): void {
  dedupeUntil.clear();
}

export function formatAppError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function notify(message: string, severity: NotificationSeverity = "info"): void {
  useNotificationsStore.getState().push(message, severity);
}

export function notifyError(message: string): void {
  notify(message, "error");
}

export function notifyErrorFromUnknown(err: unknown): void {
  notifyError(formatAppError(err));
}

export function notifyWarning(message: string): void {
  notify(message, "warning");
}

export function notifySuccess(message: string): void {
  notify(message, "success");
}

/** Show the same warning at most once per window (avoids spam during GO/autosave). */
export function notifyWarningDeduped(message: string, windowMs = DEFAULT_DEDUPE_MS): void {
  const now = Date.now();
  const until = dedupeUntil.get(message);
  if (until !== undefined && now < until) return;
  dedupeUntil.set(message, now + windowMs);
  notifyWarning(message);
}

/** Show the same error at most once per window. */
export function notifyErrorDeduped(message: string, windowMs = DEFAULT_DEDUPE_MS): void {
  const now = Date.now();
  const until = dedupeUntil.get(message);
  if (until !== undefined && now < until) return;
  dedupeUntil.set(message, now + windowMs);
  notifyError(message);
}
