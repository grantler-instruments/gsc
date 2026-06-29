import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { randomId } from "../lib/random-id";

export type NotificationSeverity = "error" | "warning" | "info" | "success";

export interface AppNotificationAction {
  label: string;
  href: string;
}

export interface AppNotification {
  id: string;
  message: string;
  severity: NotificationSeverity;
  action?: AppNotificationAction;
  /** Persist dismissal for update prompts keyed by remote version. */
  updateVersion?: string;
}

interface NotificationExtras {
  action?: AppNotificationAction;
  updateVersion?: string;
}

interface NotificationsState {
  queue: AppNotification[];
  push: (message: string, severity?: NotificationSeverity, extras?: NotificationExtras) => void;
  dismiss: (id: string) => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  devtools(
    (set) => ({
      queue: [],

      push: (message, severity = "info", extras) =>
        set((s) => ({
          queue: [
            ...s.queue,
            {
              id: randomId(),
              message,
              severity,
              action: extras?.action,
              updateVersion: extras?.updateVersion,
            },
          ],
        })),

      dismiss: (id) =>
        set((s) => ({
          queue: s.queue.filter((n) => n.id !== id),
        })),
    }),
    { name: "NotificationsStore" },
  ),
);
