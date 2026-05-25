import { sendDmxUniverses } from "../platform/send-dmx";
import { useProjectStore } from "../stores/project";
import type { Cue } from "../types/cue";
import { applyDmxCueToBuffers } from "./dmx";

/** Fire a light cue once — DMX levels persist on output; the cue does not stay active. */
export function triggerDmxCue(cue: Cue): boolean {
  if (cue.type !== "dmx" || !cue.dmx) return false;

  const fixtures = useProjectStore.getState().fixtures;
  const frames = applyDmxCueToBuffers(cue.dmx, fixtures);
  void sendDmxUniverses(frames);
  return true;
}
