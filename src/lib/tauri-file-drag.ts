export const TAURI_FILE_DRAG_EVENT = "gsc:tauri-file-drag";
export const TAURI_CUE_LIST_DRAG_EVENT = "gsc:tauri-cue-list-drag";

export interface TauriFileDragDetail {
  active: boolean;
}

export function dispatchTauriFileDrag(active: boolean): void {
  window.dispatchEvent(
    new CustomEvent<TauriFileDragDetail>(TAURI_FILE_DRAG_EVENT, {
      detail: { active },
    }),
  );
}

export function dispatchTauriCueListDrag(active: boolean): void {
  window.dispatchEvent(
    new CustomEvent<TauriFileDragDetail>(TAURI_CUE_LIST_DRAG_EVENT, {
      detail: { active },
    }),
  );
}
