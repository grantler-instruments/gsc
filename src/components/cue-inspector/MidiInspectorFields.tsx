import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import {
  clampMidiByte,
  clampMidiChannel,
  clampMidiPitchBend,
  isSystemRealtimeKind,
  MIDI_MESSAGE_KINDS,
  MIDI_PITCH_BEND_CENTER,
  MIDI_PITCH_BEND_MAX,
  MIDI_PITCH_BEND_MIN,
} from "../../lib/midi";
import type { Cue, MidiCueData, MidiMessageKind } from "../../types/cue";
import { inspectorFieldSx } from "../inspectorSx";

const MIDI_KIND_KEYS: Record<(typeof MIDI_MESSAGE_KINDS)[number], string> = {
  "note-on": "inspector.midiNoteOn",
  "note-off": "inspector.midiNoteOff",
  "control-change": "inspector.midiControlChange",
  "program-change": "inspector.midiProgramChange",
  "pitch-bend": "inspector.midiPitchBend",
  start: "inspector.midiStart",
  stop: "inspector.midiStop",
  continue: "inspector.midiContinue",
};

interface MidiInspectorFieldsProps {
  cue: Cue;
  readOnly: boolean;
  onPatch: (patch: Partial<MidiCueData>) => void;
}

export function MidiInspectorFields({ cue, readOnly, onPatch }: MidiInspectorFieldsProps) {
  const { t } = useTranslation();

  if (cue.type !== "midi" || !cue.midi) return null;

  const midi = cue.midi;
  const showChannel = !isSystemRealtimeKind(midi.kind);

  return (
    <>
      {showChannel && (
        <Box component="label" sx={inspectorFieldSx}>
          {t("inspector.channel")}
          <input
            type="number"
            min={1}
            max={16}
            value={midi.channel}
            disabled={readOnly}
            onChange={(e) => onPatch({ channel: clampMidiChannel(Number(e.currentTarget.value)) })}
          />
        </Box>
      )}

      <Box component="label" sx={inspectorFieldSx}>
        {t("inspector.messageType")}
        <select
          value={midi.kind}
          disabled={readOnly}
          onChange={(e) => onPatch({ kind: e.currentTarget.value as MidiMessageKind })}
        >
          {MIDI_MESSAGE_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(MIDI_KIND_KEYS[k])}
            </option>
          ))}
        </select>
      </Box>

      {(midi.kind === "note-on" || midi.kind === "note-off") && (
        <>
          <Box component="label" sx={inspectorFieldSx}>
            {t("inspector.note")}
            <input
              type="number"
              min={0}
              max={127}
              value={midi.note ?? 60}
              disabled={readOnly}
              onChange={(e) => onPatch({ note: clampMidiByte(Number(e.currentTarget.value)) })}
            />
          </Box>
          {midi.kind === "note-on" && (
            <Box component="label" sx={inspectorFieldSx}>
              {t("inspector.velocity")}
              <input
                type="number"
                min={0}
                max={127}
                value={midi.velocity ?? 127}
                disabled={readOnly}
                onChange={(e) =>
                  onPatch({
                    velocity: clampMidiByte(Number(e.currentTarget.value)),
                  })
                }
              />
            </Box>
          )}
        </>
      )}

      {midi.kind === "control-change" && (
        <>
          <Box component="label" sx={inspectorFieldSx}>
            {t("inspector.controller")}
            <input
              type="number"
              min={0}
              max={127}
              value={midi.controller ?? 0}
              disabled={readOnly}
              onChange={(e) =>
                onPatch({
                  controller: clampMidiByte(Number(e.currentTarget.value)),
                })
              }
            />
          </Box>
          <Box component="label" sx={inspectorFieldSx}>
            {t("inspector.value")}
            <input
              type="number"
              min={0}
              max={127}
              value={midi.value ?? 0}
              disabled={readOnly}
              onChange={(e) => onPatch({ value: clampMidiByte(Number(e.currentTarget.value)) })}
            />
          </Box>
        </>
      )}

      {midi.kind === "program-change" && (
        <Box component="label" sx={inspectorFieldSx}>
          {t("inspector.program")}
          <input
            type="number"
            min={0}
            max={127}
            value={midi.program ?? 0}
            disabled={readOnly}
            onChange={(e) => onPatch({ program: clampMidiByte(Number(e.currentTarget.value)) })}
          />
        </Box>
      )}

      {midi.kind === "pitch-bend" && (
        <Box component="label" sx={inspectorFieldSx}>
          {t("inspector.pitchBend")}
          <input
            type="number"
            min={MIDI_PITCH_BEND_MIN}
            max={MIDI_PITCH_BEND_MAX}
            value={midi.pitchBend ?? MIDI_PITCH_BEND_CENTER}
            disabled={readOnly}
            onChange={(e) =>
              onPatch({ pitchBend: clampMidiPitchBend(Number(e.currentTarget.value)) })
            }
          />
        </Box>
      )}
    </>
  );
}
