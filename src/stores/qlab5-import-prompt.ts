import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Qlab5ImportResult } from "../lib/qlab5/import-qlab5-project";

interface Qlab5ImportConfirmState {
  open: boolean;
  pathLabel: string;
  resolve: ((confirmed: boolean) => void) | null;
}

export const useQlab5ImportConfirmStore = create<Qlab5ImportConfirmState>()(
  devtools(
    () => ({
      open: false,
      pathLabel: "",
      resolve: null,
    }),
    { name: "Qlab5ImportConfirmStore" },
  ),
);

export function requestQlab5ImportConfirm(pathLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    useQlab5ImportConfirmStore.setState({ open: true, pathLabel, resolve });
  });
}

export function resolveQlab5ImportConfirm(confirmed: boolean): void {
  const { resolve } = useQlab5ImportConfirmStore.getState();
  useQlab5ImportConfirmStore.setState({ open: false, pathLabel: "", resolve: null });
  resolve?.(confirmed);
}

interface Qlab5ImportReportState {
  open: boolean;
  result: Qlab5ImportResult | null;
  resolve: (() => void) | null;
}

export const useQlab5ImportReportStore = create<Qlab5ImportReportState>()(
  devtools(
    () => ({
      open: false,
      result: null,
      resolve: null,
    }),
    { name: "Qlab5ImportReportStore" },
  ),
);

export function requestQlab5ImportReport(result: Qlab5ImportResult): Promise<void> {
  return new Promise((resolve) => {
    useQlab5ImportReportStore.setState({ open: true, result, resolve });
  });
}

export function resolveQlab5ImportReport(): void {
  const { resolve } = useQlab5ImportReportStore.getState();
  useQlab5ImportReportStore.setState({ open: false, result: null, resolve: null });
  resolve?.();
}
