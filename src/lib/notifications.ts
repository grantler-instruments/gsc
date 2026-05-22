import {
  useNotificationsStore,
  type NotificationSeverity,
} from "../stores/notifications";

export function formatAppError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function notify(
  message: string,
  severity: NotificationSeverity = "info",
): void {
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
