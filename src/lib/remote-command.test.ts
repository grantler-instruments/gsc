import { describe, expect, it } from "vitest";
import { remoteCommandToWirePayload } from "./remote-command";

describe("remoteCommandToWirePayload", () => {
  it("uses snake_case ids for Rust", () => {
    expect(remoteCommandToWirePayload({ action: "select-cue", cueId: "cue-1" })).toEqual({
      action: "select-cue",
      cue_id: "cue-1",
    });
    expect(remoteCommandToWirePayload({ action: "go", cueId: "cue-2" })).toEqual({
      action: "go",
      cue_id: "cue-2",
    });
    expect(
      remoteCommandToWirePayload({ action: "set-active-cue-list", cueListId: "list-1" }),
    ).toEqual({
      action: "set-active-cue-list",
      cue_list_id: "list-1",
    });
  });
});
