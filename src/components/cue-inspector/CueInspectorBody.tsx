import {
  isContainerCue,
  isFadeCue,
  isStopCue,
  isWaitCue,
} from "../../lib/cues";
import { getCueAssetWarning } from "../../lib/cue-asset";
import type { Cue, MidiCueData, OscCueData } from "../../types/cue";
import { CueAssetAssign } from "../CueAssetAssign";
import { ContainerInspectorFields } from "../ContainerInspectorFields";
import { FadeInspectorFields } from "../FadeInspectorFields";
import { StopInspectorFields } from "../StopInspectorFields";
import { WaitInspectorFields } from "../WaitInspectorFields";
import { CueInspectorNameFields } from "./CueInspectorNameFields";
import { MediaInspectorFields } from "./MediaInspectorFields";
import { MidiInspectorFields } from "./MidiInspectorFields";
import { OscInspectorFields } from "./OscInspectorFields";

interface CueInspectorBodyProps {
  cue: Cue;
  cues: Cue[];
  readOnly: boolean;
  oscReadOnly: boolean;
  oscDisabled: boolean;
  onUpdate: (patch: Partial<Cue>) => void;
}

export function CueInspectorBody({
  cue,
  cues,
  readOnly,
  oscReadOnly,
  oscDisabled,
  onUpdate,
}: CueInspectorBodyProps) {
  const assetWarning = getCueAssetWarning(cue);

  const patchMidi = (midiPatch: Partial<MidiCueData>) => {
    if (readOnly || cue.type !== "midi" || !cue.midi) return;
    onUpdate({ midi: { ...cue.midi, ...midiPatch } });
  };

  const patchOsc = (oscPatch: Partial<OscCueData>) => {
    if (oscReadOnly || cue.type !== "osc" || !cue.osc) return;
    onUpdate({ osc: { ...cue.osc, ...oscPatch } });
  };

  return (
    <>
      <CueInspectorNameFields
        cue={cue}
        cues={cues}
        readOnly={readOnly}
        onNameChange={(name) => onUpdate({ name })}
        onNotesChange={(notes) => onUpdate({ notes })}
      />

      {assetWarning && <CueAssetAssign cue={cue} readOnly={readOnly} />}

      {isContainerCue(cue) && <ContainerInspectorFields container={cue} />}

      {isStopCue(cue) && <StopInspectorFields stopCue={cue} />}

      {isFadeCue(cue) && <FadeInspectorFields fadeCue={cue} />}

      {isWaitCue(cue) && <WaitInspectorFields waitCue={cue} />}

      <MidiInspectorFields cue={cue} readOnly={readOnly} onPatch={patchMidi} />

      <OscInspectorFields
        cue={cue}
        readOnly={oscReadOnly}
        oscDisabled={oscDisabled}
        onPatch={patchOsc}
      />

      <MediaInspectorFields cue={cue} readOnly={readOnly} onChange={onUpdate} />
    </>
  );
}
