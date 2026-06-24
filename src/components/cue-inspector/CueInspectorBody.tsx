import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { getCueAssetWarning } from "../../lib/cue-asset";
import { isContainerCue, isFadeCue, isStopCue, isWaitCue } from "../../lib/cues";
import { getTtsCueWarning, isTtsCue } from "../../lib/tts";
import type { Cue, MidiCueData, OscCueData } from "../../types/cue";
import { ContainerInspectorFields } from "../ContainerInspectorFields";
import { CueAssetAssign } from "../CueAssetAssign";
import { FadeInspectorFields } from "../FadeInspectorFields";
import { StopInspectorFields } from "../StopInspectorFields";
import { WaitInspectorFields } from "../WaitInspectorFields";
import { CueInspectorNameFields } from "./CueInspectorNameFields";
import { DmxInspectorFields } from "./DmxInspectorFields";
import { MediaInspectorFields } from "./MediaInspectorFields";
import { MidiInspectorFields } from "./MidiInspectorFields";
import { OscInspectorFields } from "./OscInspectorFields";
import { TtsInspectorFields } from "./TtsInspectorFields";

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
  const assetWarning = isTtsCue(cue) ? getTtsCueWarning(cue) : getCueAssetWarning(cue);

  const patchMidi = (midiPatch: Partial<MidiCueData>) => {
    if (readOnly || cue.type !== "midi" || !cue.midi) return;
    onUpdate({ midi: { ...cue.midi, ...midiPatch } });
  };

  const patchOsc = (oscPatch: Partial<OscCueData>) => {
    if (oscReadOnly || cue.type !== "osc" || !cue.osc) return;
    onUpdate({ osc: { ...cue.osc, ...oscPatch } });
  };

  const isLightInspector = cue.type === "dmx" || cue.type === "lightFade";

  if (isLightInspector) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <CueInspectorNameFields
            cue={cue}
            cues={cues}
            readOnly={readOnly}
            onNameChange={(name) => onUpdate({ name })}
            onNotesChange={(notes) => onUpdate({ notes })}
            onTriggerNoteChange={(triggerNote) => onUpdate({ triggerNote })}
          />

          {isFadeCue(cue) && <FadeInspectorFields fadeCue={cue} />}
        </Box>

        <DmxInspectorFields
          cue={cue}
          cues={cues}
          readOnly={dmxReadOnly}
          dmxDisabled={dmxDisabled}
          onUpdate={onUpdate}
        />
      </Box>
    );
  }

  return (
    <>
      <CueInspectorNameFields
        cue={cue}
        cues={cues}
        readOnly={readOnly}
        onNameChange={(name) => onUpdate({ name })}
        onNotesChange={(notes) => onUpdate({ notes })}
        onTriggerNoteChange={(triggerNote) => onUpdate({ triggerNote })}
      />

      {assetWarning && !isTtsCue(cue) ? <CueAssetAssign cue={cue} readOnly={readOnly} /> : null}

      {isTtsCue(cue) && assetWarning ? (
        <Typography variant="body2" color="warning.main" sx={{ m: 0 }}>
          {assetWarning.detail}
        </Typography>
      ) : null}

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

      <TtsInspectorFields cue={cue} readOnly={readOnly} onChange={onUpdate} />

      <MediaInspectorFields cue={cue} readOnly={readOnly} onChange={onUpdate} />
    </>
  );
}
