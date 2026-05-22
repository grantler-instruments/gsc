import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  clampMidiByte,
  clampMidiChannel,
  MIDI_MESSAGE_KINDS,
} from "../lib/midi";
import {
  clampOscPort,
} from "../lib/osc";
import { OscArgsField } from "./OscArgsField";
import { getPlatform } from "../platform";
import { useActiveCueList, useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import type { MidiCueData, MidiMessageKind, OscCueData } from "../types/cue";
import { getPrimarySelectedCueId } from "../lib/cue-selection";
import { getCueAssetWarning } from "../lib/cue-asset";
import { CueAssetAssign } from "./CueAssetAssign";
import {
  getCueDisplayName,
  isContainerCue,
  isFadeCue,
  isStopCue,
  isWaitCue,
} from "../lib/cues";
import { CueTypeBadge } from "./CueTypeIcon";
import { ContainerInspectorFields } from "./ContainerInspectorFields";
import { FadeInspectorFields } from "./FadeInspectorFields";
import { StopInspectorFields } from "./StopInspectorFields";
import { WaitInspectorFields } from "./WaitInspectorFields";
import { LoopFields } from "./LoopFields";
import { PlaybackRangeFields } from "./PlaybackRangeFields";
import { CueAssetPreview } from "./CueAssetPreview";
import { PanelHeader } from "./layout/PanelHeader";
import {
  inspectorFieldLabelSx,
  inspectorFieldSx,
  inspectorFieldsSx,
  inspectorGroupHintSx,
  inspectorPanelEmptySx,
  inspectorPanelSx,
  inspectorReadonlySx,
} from "./inspectorSx";

export function CueInspector() {
  const activeList = useActiveCueList();
  const cues = activeList.cues;
  const updateCue = useProjectStore((s) => s.updateCue);
  const showMode = useUiStore((s) => s.showMode);
  const readOnly = showMode;
  const oscDisabled = getPlatform() !== "tauri";
  const oscReadOnly = readOnly || oscDisabled;

  const selectedCueId = getPrimarySelectedCueId(activeList.selectedCueIds);
  const cue = cues.find((c) => c.id === selectedCueId);

  if (!cue) {
    return (
      <Box component="aside" sx={inspectorPanelEmptySx}>
        <Typography variant="caption" color="text.secondary" sx={{ m: 0 }}>
          Select a cue to edit its properties.
        </Typography>
      </Box>
    );
  }

  const assetWarning = cue ? getCueAssetWarning(cue) : null;

  const patchMidi = (midiPatch: Partial<MidiCueData>) => {
    if (readOnly || cue.type !== "midi" || !cue.midi) return;
    updateCue(cue.id, { midi: { ...cue.midi, ...midiPatch } });
  };

  const patchOsc = (oscPatch: Partial<OscCueData>) => {
    if (oscReadOnly || cue.type !== "osc" || !cue.osc) return;
    updateCue(cue.id, { osc: { ...cue.osc, ...oscPatch } });
  };

  return (
    <Box component="aside" sx={inspectorPanelSx}>
      <PanelHeader title={showMode ? "Inspector (view)" : "Inspector"}>
        <CueTypeBadge type={cue.type} />
      </PanelHeader>

      <Box sx={inspectorFieldsSx}>
        {isStopCue(cue) || isFadeCue(cue) ? (
          <Box component="label" sx={inspectorFieldSx}>
            <Typography component="span" sx={inspectorFieldLabelSx}>
              Display name
            </Typography>
            <Typography component="p" sx={inspectorReadonlySx}>
              {getCueDisplayName(cue, cues)}
            </Typography>
            <Typography component="p" sx={inspectorGroupHintSx}>
              Always follows the target cue&apos;s name when that cue is renamed.
            </Typography>
          </Box>
        ) : (
          <TextField
            label="Name"
            value={cue.name}
            fullWidth
            slotProps={{ input: { readOnly } }}
            onChange={(e) => updateCue(cue.id, { name: e.target.value })}
            sx={{ mb: 1.5 }}
          />
        )}

        <TextField
          label="Notes"
          multiline
          minRows={4}
          fullWidth
          value={cue.notes ?? ""}
          placeholder="Production notes, lines, reminders…"
          slotProps={{ input: { readOnly } }}
          onChange={(e) => updateCue(cue.id, { notes: e.target.value })}
          sx={{ mb: 1.5 }}
        />

        {assetWarning && (
          <CueAssetAssign cue={cue} readOnly={readOnly} />
        )}

        {isContainerCue(cue) && <ContainerInspectorFields container={cue} />}

        {isStopCue(cue) && <StopInspectorFields stopCue={cue} />}

        {isFadeCue(cue) && <FadeInspectorFields fadeCue={cue} />}

        {isWaitCue(cue) && <WaitInspectorFields waitCue={cue} />}

        {cue.type === "midi" && cue.midi && (
          <>
            <Box component="label" sx={inspectorFieldSx}>
              Channel
              <input
                type="number"
                min={1}
                max={16}
                value={cue.midi.channel}
                disabled={readOnly}
                onChange={(e) =>
                  patchMidi({
                    channel: clampMidiChannel(Number(e.currentTarget.value)),
                  })
                }
              />
            </Box>

            <Box component="label" sx={inspectorFieldSx}>
              Message
              <select
                value={cue.midi.kind}
                disabled={readOnly}
                onChange={(e) =>
                  patchMidi({ kind: e.currentTarget.value as MidiMessageKind })
                }
              >
                {MIDI_MESSAGE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </Box>

            {(cue.midi.kind === "note-on" || cue.midi.kind === "note-off") && (
              <>
                <Box component="label" sx={inspectorFieldSx}>
                  Note
                  <input
                    type="number"
                    min={0}
                    max={127}
                    value={cue.midi.note ?? 60}
                    disabled={readOnly}
                    onChange={(e) =>
                      patchMidi({
                        note: clampMidiByte(Number(e.currentTarget.value)),
                      })
                    }
                  />
                </Box>
                {cue.midi.kind === "note-on" && (
                  <Box component="label" sx={inspectorFieldSx}>
                    Velocity
                    <input
                      type="number"
                      min={0}
                      max={127}
                      value={cue.midi.velocity ?? 127}
                      disabled={readOnly}
                      onChange={(e) =>
                        patchMidi({
                          velocity: clampMidiByte(
                            Number(e.currentTarget.value),
                          ),
                        })
                      }
                    />
                  </Box>
                )}
              </>
            )}

            {cue.midi.kind === "control-change" && (
              <>
                <Box component="label" sx={inspectorFieldSx}>
                  Controller
                  <input
                    type="number"
                    min={0}
                    max={127}
                    value={cue.midi.controller ?? 0}
                    disabled={readOnly}
                    onChange={(e) =>
                      patchMidi({
                        controller: clampMidiByte(
                          Number(e.currentTarget.value),
                        ),
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
                    value={cue.midi.value ?? 0}
                    disabled={readOnly}
                    onChange={(e) =>
                      patchMidi({
                        value: clampMidiByte(Number(e.currentTarget.value)),
                      })
                    }
                  />
                </Box>
              </>
            )}

            {cue.midi.kind === "program-change" && (
              <Box component="label" sx={inspectorFieldSx}>
                Program
                <input
                  type="number"
                  min={0}
                  max={127}
                  value={cue.midi.program ?? 0}
                  disabled={readOnly}
                  onChange={(e) =>
                    patchMidi({
                      program: clampMidiByte(Number(e.currentTarget.value)),
                    })
                  }
                />
              </Box>
            )}
          </>
        )}

        {cue.type === "osc" && cue.osc && (
          <>
            {oscDisabled && (
              <Typography component="p" sx={inspectorGroupHintSx}>
                OSC sending requires the desktop app.
              </Typography>
            )}

            <Box component="label" sx={inspectorFieldSx}>
              Host
              <input
                type="text"
                value={cue.osc.host}
                disabled={oscReadOnly}
                onChange={(e) => patchOsc({ host: e.currentTarget.value })}
              />
            </Box>

            <Box component="label" sx={inspectorFieldSx}>
              Port
              <input
                type="number"
                min={1}
                max={65535}
                value={cue.osc.port}
                disabled={oscReadOnly}
                onChange={(e) =>
                  patchOsc({
                    port: clampOscPort(Number(e.currentTarget.value)),
                  })
                }
              />
            </Box>

            <Box component="label" sx={inspectorFieldSx}>
              Address
              <input
                type="text"
                value={cue.osc.address}
                disabled={oscReadOnly}
                placeholder="/cue/1/start"
                onChange={(e) => patchOsc({ address: e.currentTarget.value })}
              />
            </Box>

            <OscArgsField
              cueId={cue.id}
              args={cue.osc.args}
              readOnly={oscReadOnly}
              onChange={(args) => patchOsc({ args })}
            />
          </>
        )}

        {(cue.type === "video" || cue.type === "image") && cue.assetPath && (
          <Box sx={inspectorFieldSx}>
            <Typography component="span" sx={inspectorFieldLabelSx}>
              Preview
            </Typography>
            <CueAssetPreview cue={cue} />
          </Box>
        )}

        {(cue.type === "audio" ||
          cue.type === "video" ||
          cue.type === "image") && (
          <PlaybackRangeFields
            cue={cue}
            readOnly={readOnly}
            onChange={(patch) => updateCue(cue.id, patch)}
          />
        )}

        {(cue.type === "audio" || cue.type === "video") && (
          <>
            <LoopFields
              cue={cue}
              readOnly={readOnly}
              onChange={(patch) => updateCue(cue.id, patch)}
            />
            <Box component="label" sx={inspectorFieldSx}>
              Fade in (s)
              <input
                type="number"
                min={0}
                step={0.1}
                value={cue.fadeIn ?? 0}
                disabled={readOnly}
                onChange={(e) =>
                  updateCue(cue.id, {
                    fadeIn: Math.max(0, Number(e.currentTarget.value)),
                  })
                }
              />
            </Box>
            <Box component="label" sx={inspectorFieldSx}>
              Fade out (s)
              <input
                type="number"
                min={0}
                step={0.1}
                value={cue.fadeOut ?? 0}
                disabled={readOnly}
                onChange={(e) =>
                  updateCue(cue.id, {
                    fadeOut: Math.max(0, Number(e.currentTarget.value)),
                  })
                }
              />
            </Box>
            <Box component="label" sx={inspectorFieldSx}>
              Volume
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={cue.volume ?? 1}
                disabled={readOnly}
                onChange={(e) =>
                  updateCue(cue.id, { volume: Number(e.currentTarget.value) })
                }
              />
            </Box>
          </>
        )}

        {(cue.type === "video" || cue.type === "image") && (
          <Box component="label" sx={inspectorFieldSx}>
            Opacity
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={cue.opacity ?? 1}
              disabled={readOnly}
              onChange={(e) =>
                updateCue(cue.id, { opacity: Number(e.currentTarget.value) })
              }
            />
          </Box>
        )}

        {cue.assetPath && (
          <Box component="label" sx={inspectorFieldSx}>
            Asset
            <input type="text" value={cue.assetPath} readOnly />
          </Box>
        )}

      </Box>
    </Box>
  );
}
