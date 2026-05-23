import Box from "@mui/material/Box";
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
import { DmxInspectorFields } from "./DmxInspectorFields";
import { MediaInspectorFields } from "./MediaInspectorFields";
import { MidiInspectorFields } from "./MidiInspectorFields";
import { OscInspectorFields } from "./OscInspectorFields";

interface CueInspectorBodyProps {
  cue: Cue;
  cues: Cue[];
  readOnly: boolean;
  oscReadOnly: boolean;
  oscDisabled: boolean;
  dmxReadOnly: boolean;
  dmxDisabled: boolean;
  onUpdate: (patch: Partial<Cue>) => void;
}

export function CueInspectorBody({
  cue,
  cues,
  readOnly,
  oscReadOnly,
  oscDisabled,
  dmxReadOnly,
  dmxDisabled,
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

  const isLightInspector = cue.type === "dmx" || cue.type === "lightFade";

  const dmxFields = (
    <Box
      sx={
        isLightInspector
          ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }
          : undefined
      }
    >
      <DmxInspectorFields
        cue={cue}
        readOnly={dmxReadOnly}
        dmxDisabled={dmxDisabled}
        onUpdate={onUpdate}
      />
    </Box>
  );

  const body = (
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

      {dmxFields}

      <MediaInspectorFields cue={cue} readOnly={readOnly} onChange={onUpdate} />
    </>
  );

  if (!isLightInspector) {
    return body;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        gap: 1.5,
      }}
    >
      {body}
    </Box>
  );
}
