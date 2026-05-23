import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type NotificationSeverity = "error" | "warning" | "info" | "success";

export interface AppNotification {
  id: string;
  message: string;
  severity: NotificationSeverity;
}

interface NotificationsState {
  queue: AppNotification[];
  push: (message: string, severity?: NotificationSeverity) => void;
  dismiss: (id: string) => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  devtools(
    (set) => ({
      queue: [],

      push: (message, severity = "info") =>
        set((s) => ({
          queue: [...s.queue, { id: crypto.randomUUID(), message, severity }],
        })),

      dismiss: (id) =>
        set((s) => ({
          queue: s.queue.filter((n) => n.id !== id),
        })),
    }),
    { name: "NotificationsStore" },
  ),
);
