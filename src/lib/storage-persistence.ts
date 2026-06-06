export interface StorageEstimate {
  usage: number;
  quota: number;
}

export type StoragePressure = "ok" | "warning" | "critical";

const WARNING_RATIO = 0.75;
const CRITICAL_RATIO = 0.9;

let persistRequested = false;

export async function requestPersistentStorage(): Promise<boolean> {
  if (persistRequested) {
    return navigator.storage?.persisted?.() ?? false;
  }
  persistRequested = true;
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function estimateStorage(): Promise<StorageEstimate | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function getStoragePressure(): Promise<StoragePressure> {
  const estimate = await estimateStorage();
  if (!estimate || estimate.quota <= 0) return "ok";
  const ratio = estimate.usage / estimate.quota;
  if (ratio >= CRITICAL_RATIO) return "critical";
  if (ratio >= WARNING_RATIO) return "warning";
  return "ok";
}
