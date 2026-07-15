import type { RemoteCommandAction, RemoteHostCommand } from "../types/remote";

/** Map TS command actions to the snake_case wire format the Rust server expects. */
export function remoteCommandToWirePayload(action: RemoteCommandAction): RemoteHostCommand {
  switch (action.action) {
    case "go-selected":
      return { action: "go-selected" };
    case "go":
      return { action: "go", cue_id: action.cueId };
    case "hot-go":
      return { action: "hot-go", cue_id: action.cueId };
    case "select-cue":
      return { action: "select-cue", cue_id: action.cueId };
    case "panic":
      return { action: "panic" };
    case "set-master-volume":
      return { action: "set-master-volume", value: action.value };
    case "set-active-cue-list":
      return { action: "set-active-cue-list", cue_list_id: action.cueListId };
  }
}
