import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { cueNeedsAsset } from "../../lib/cue-asset";
import { isContainerCue, isFadeCue, isStopCue, isWaitCue } from "../../lib/cues";
import type { Cue, MidiCueData, OscCueData } from "../../types/cue";
import { ContainerInspectorFields } from "../ContainerInspectorFields";
import { CueAssetAssign } from "../CueAssetAssign";
import { FadeInspectorFields } from "../FadeInspectorFields";
import { InspectorAccordion } from "../InspectorAccordion";
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

function CueInspectorDetails({
  cue,
  cues,
  readOnly,
  oscReadOnly,
  oscDisabled,
  dmxReadOnly,
  dmxDisabled,
  onUpdate,
  patchMidi,
  patchOsc,
}: CueInspectorBodyProps & {
  patchMidi: (midiPatch: Partial<MidiCueData>) => void;
  patchOsc: (oscPatch: Partial<OscCueData>) => void;
}) {
  const isLightInspector = cue.type === "dmx" || cue.type === "lightFade";

  if (isLightInspector) {
    return (
      <>
        {isFadeCue(cue) && <FadeInspectorFields fadeCue={cue} />}
        <DmxInspectorFields
          cue={cue}
          cues={cues}
          readOnly={dmxReadOnly}
          dmxDisabled={dmxDisabled}
          onUpdate={onUpdate}
        />
      </>
    );
  }

  return (
    <>
      {cueNeedsAsset(cue) && <CueAssetAssign cue={cue} readOnly={readOnly} />}

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
  const { t } = useTranslation();

  const patchMidi = (midiPatch: Partial<MidiCueData>) => {
    if (readOnly || cue.type !== "midi" || !cue.midi) return;
    onUpdate({ midi: { ...cue.midi, ...midiPatch } });
  };

  const patchOsc = (oscPatch: Partial<OscCueData>) => {
    if (oscReadOnly || cue.type !== "osc" || !cue.osc) return;
    onUpdate({ osc: { ...cue.osc, ...oscPatch } });
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        gap: 0,
      }}
    >
      <InspectorAccordion title={t("inspector.sectionGeneral")} id="inspector-general" compact>
        <CueInspectorNameFields
          cue={cue}
          cues={cues}
          readOnly={readOnly}
          onNameChange={(name) => onUpdate({ name })}
          onNotesChange={(notes) => onUpdate({ notes })}
          onTriggerNoteChange={(triggerNote) => onUpdate({ triggerNote })}
        />
      </InspectorAccordion>

      <InspectorAccordion title={t("inspector.sectionDetails")} id="inspector-details" scroll>
        <CueInspectorDetails
          cue={cue}
          cues={cues}
          readOnly={readOnly}
          oscReadOnly={oscReadOnly}
          oscDisabled={oscDisabled}
          dmxReadOnly={dmxReadOnly}
          dmxDisabled={dmxDisabled}
          onUpdate={onUpdate}
          patchMidi={patchMidi}
          patchOsc={patchOsc}
        />
      </InspectorAccordion>
    </Box>
  );
}
