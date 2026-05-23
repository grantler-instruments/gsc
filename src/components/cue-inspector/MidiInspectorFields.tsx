import Box from "@mui/material/Box";
import { clampMidiByte, clampMidiChannel, MIDI_MESSAGE_KINDS } from "../../lib/midi";
import type { Cue, MidiCueData, MidiMessageKind } from "../../types/cue";
import { inspectorFieldSx } from "../inspectorSx";

interface MidiInspectorFieldsProps {
  cue: Cue;
  readOnly: boolean;
  onPatch: (patch: Partial<MidiCueData>) => void;
}

export function MidiInspectorFields({ cue, readOnly, onPatch }: MidiInspectorFieldsProps) {
  if (cue.type !== "midi" || !cue.midi) return null;

  const midi = cue.midi;

  return (
    <>
      <Box component="label" sx={inspectorFieldSx}>
        Channel
        <input
          type="number"
          min={1}
          max={16}
          value={midi.channel}
          disabled={readOnly}
          onChange={(e) => onPatch({ channel: clampMidiChannel(Number(e.currentTarget.value)) })}
        />
      </Box>

      <Box component="label" sx={inspectorFieldSx}>
        Message
        <select
          value={midi.kind}
          disabled={readOnly}
          onChange={(e) => onPatch({ kind: e.currentTarget.value as MidiMessageKind })}
        >
          {MIDI_MESSAGE_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </Box>

      {(midi.kind === "note-on" || midi.kind === "note-off") && (
        <>
          <Box component="label" sx={inspectorFieldSx}>
            Note
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
              Velocity
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
            Controller
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
            Value
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
          Program
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
    </>
  );
}
