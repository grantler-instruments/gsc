import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  clampMidiByte,
  clampMidiChannel,
  MIDI_MESSAGE_KINDS,
} from "../lib/midi";
import { useActiveCueList, useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import type { MidiCueData, MidiMessageKind } from "../types/cue";
import { getPrimarySelectedCueId } from "../lib/cue-selection";
import { getCueDisplayName, isContainerCue, isFadeCue, isStopCue } from "../lib/cues";
import { CueTypeBadge } from "./CueTypeIcon";
import { ContainerInspectorFields } from "./ContainerInspectorFields";
import { FadeInspectorFields } from "./FadeInspectorFields";
import { StopInspectorFields } from "./StopInspectorFields";
import { LoopFields } from "./LoopFields";
import { PlaybackRangeFields } from "./PlaybackRangeFields";
import { CueAssetPreview } from "./CueAssetPreview";
import { PanelHeader } from "./layout/PanelHeader";

export function CueInspector() {
  const activeList = useActiveCueList();
  const cues = activeList.cues;
  const updateCue = useProjectStore((s) => s.updateCue);
  const showMode = useUiStore((s) => s.showMode);
  const readOnly = showMode;

  const selectedCueId = getPrimarySelectedCueId(activeList.selectedCueIds);
  const cue = cues.find((c) => c.id === selectedCueId);

  if (!cue) {
    return (
      <Box
        component="aside"
        className="cue-inspector cue-inspector-empty"
        sx={{
          width: 320,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ m: 0 }}>
          Select a cue to edit its properties.
        </Typography>
      </Box>
    );
  }

  const patchMidi = (midiPatch: Partial<MidiCueData>) => {
    if (readOnly || cue.type !== "midi" || !cue.midi) return;
    updateCue(cue.id, { midi: { ...cue.midi, ...midiPatch } });
  };

  return (
    <Box
      component="aside"
      className={["cue-inspector", showMode && "cue-inspector-show-mode"]
        .filter(Boolean)
        .join(" ")}
      sx={{
        width: 320,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        bgcolor: "background.paper",
      }}
    >
      <PanelHeader title={showMode ? "Inspector (view)" : "Inspector"}>
        <CueTypeBadge type={cue.type} />
      </PanelHeader>

      <Box className="inspector-fields" sx={{ flex: 1, overflow: "auto", p: 1.5 }}>
        {isStopCue(cue) || isFadeCue(cue) ? (
          <div className="inspector-field">
            <span className="inspector-field-label">Display name</span>
            <p className="inspector-readonly">{getCueDisplayName(cue, cues)}</p>
            <p className="inspector-group-hint">
              Always follows the target cue&apos;s name when that cue is renamed.
            </p>
          </div>
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

        {isContainerCue(cue) && <ContainerInspectorFields container={cue} />}

        {isStopCue(cue) && <StopInspectorFields stopCue={cue} />}

        {isFadeCue(cue) && <FadeInspectorFields fadeCue={cue} />}

        {cue.type === "midi" && cue.midi && (
          <>
            <label className="inspector-field">
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
            </label>

            <label className="inspector-field">
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
            </label>

            {(cue.midi.kind === "note-on" || cue.midi.kind === "note-off") && (
              <>
                <label className="inspector-field">
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
                </label>
                {cue.midi.kind === "note-on" && (
                  <label className="inspector-field">
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
                  </label>
                )}
              </>
            )}

            {cue.midi.kind === "control-change" && (
              <>
                <label className="inspector-field">
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
                </label>
                <label className="inspector-field">
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
                </label>
              </>
            )}

            {cue.midi.kind === "program-change" && (
              <label className="inspector-field">
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
              </label>
            )}
          </>
        )}

        {(cue.type === "video" || cue.type === "image") && cue.assetPath && (
          <div className="inspector-field">
            <span className="inspector-field-label">Preview</span>
            <CueAssetPreview cue={cue} />
          </div>
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
            <label className="inspector-field">
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
            </label>
            <label className="inspector-field">
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
            </label>
            <label className="inspector-field">
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
            </label>
          </>
        )}

        {(cue.type === "video" || cue.type === "image") && (
          <label className="inspector-field">
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
          </label>
        )}

        {cue.assetPath && (
          <label className="inspector-field">
            Asset
            <input type="text" value={cue.assetPath} readOnly />
          </label>
        )}

        {cue.type === "image" && !cue.assetPath && (
          <p className="inspector-hint">
            Drag an image from Assets onto this cue, or onto the cue list.
          </p>
        )}
      </Box>
    </Box>
  );
}
