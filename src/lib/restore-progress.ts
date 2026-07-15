import { t } from "../i18n/t";
import { useProjectLoadingStore } from "../stores/project-loading";

export async function withRestoreStep<T>(
  id: string,
  labelKey: string,
  fn: () => Promise<T>,
  detail?: string,
): Promise<T> {
  const store = useProjectLoadingStore.getState();
  store.startRestoreStep(id, t(labelKey), detail);
  try {
    const result = await fn();
    store.finishRestoreStep(id);
    return result;
  } catch (err) {
    store.failRestoreStep(id, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

export function startRestoreStep(id: string, labelKey: string, detail?: string): void {
  useProjectLoadingStore.getState().startRestoreStep(id, t(labelKey), detail);
}

export function finishRestoreStep(id: string, detail?: string): void {
  useProjectLoadingStore.getState().finishRestoreStep(id, detail);
}

export function failRestoreStep(id: string, detail?: string): void {
  useProjectLoadingStore.getState().failRestoreStep(id, detail);
}

export function clearRestoreSteps(): void {
  useProjectLoadingStore.getState().clearRestoreSteps();
}
