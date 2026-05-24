import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatMidiCue } from "../lib/midi";
import { formatMidiActionLabel } from "../lib/midi-mapping";
import { useActiveCueList, useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import type { MidiAction } from "../types/midi-mapping";
import { inspectorFieldLabelSx, inspectorFieldSx } from "./inspectorSx";

const DEFAULT_LEARN_ACTION: MidiAction = { type: "go-selected" };

export function MidiMapPanel() {
  const { t } = useTranslation();
  const list = useActiveCueList();
  const midiMappings = useProjectStore((s) => s.midiMappings);
  const removeMidiMapping = useProjectStore((s) => s.removeMidiMapping);
  const updateMidiMapping = useProjectStore((s) => s.updateMidiMapping);
  const autoMapNotesToCues = useProjectStore((s) => s.autoMapNotesToCues);
  const setMidiMappings = useProjectStore((s) => s.setMidiMappings);

  const midiLearnAction = useUiStore((s) => s.midiLearnAction);
  const setMidiLearnAction = useUiStore((s) => s.setMidiLearnAction);

  const [learnAction, setLearnAction] = useState<MidiAction>(DEFAULT_LEARN_ACTION);
  const [learnCueId, setLearnCueId] = useState<string>("");

  const topLevelCues = useMemo(() => list.cues.filter((c) => !c.parentId), [list.cues]);

  const resolvedLearnAction: MidiAction =
    learnAction.type === "go-cue" || learnAction.type === "select-cue"
      ? { ...learnAction, cueId: learnCueId || (topLevelCues[0]?.id ?? "") }
      : learnAction;

  const startLearn = () => {
    if (
      (resolvedLearnAction.type === "go-cue" || resolvedLearnAction.type === "select-cue") &&
      !resolvedLearnAction.cueId
    ) {
      return;
    }
    setMidiLearnAction(resolvedLearnAction);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {t("midiMap.description")}
      </Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ ...inspectorFieldSx, flex: "1 1 140px", minWidth: 120 }}>
          <Typography component="span" sx={inspectorFieldLabelSx}>
            {t("midiMap.learnAction")}
          </Typography>
          <Select
            size="small"
            fullWidth
            value={learnAction.type}
            onChange={(e) => {
              const type = e.target.value as MidiAction["type"];
              if (type === "go-cue" || type === "select-cue") {
                setLearnAction({
                  type,
                  cueId: learnCueId || (topLevelCues[0]?.id ?? ""),
                });
              } else {
                setLearnAction({ type });
              }
            }}
          >
            <MenuItem value="go-selected">{t("midiMap.goSelected")}</MenuItem>
            <MenuItem value="go-cue">{t("midiMap.goCue")}</MenuItem>
            <MenuItem value="select-cue">{t("midiMap.selectCue")}</MenuItem>
            <MenuItem value="panic">{t("midiMap.panic")}</MenuItem>
          </Select>
        </Box>

        {(learnAction.type === "go-cue" || learnAction.type === "select-cue") && (
          <Box sx={{ ...inspectorFieldSx, flex: "1 1 160px", minWidth: 140 }}>
            <Typography component="span" sx={inspectorFieldLabelSx}>
              {t("midiMap.cue")}
            </Typography>
            <Select
              size="small"
              fullWidth
              value={learnCueId || (topLevelCues[0]?.id ?? "")}
              onChange={(e) => {
                setLearnCueId(e.target.value);
                setLearnAction({
                  type: learnAction.type,
                  cueId: e.target.value,
                });
              }}
            >
              {topLevelCues.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.number} — {c.name}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}

        <Button
          variant={midiLearnAction ? "contained" : "outlined"}
          color={midiLearnAction ? "warning" : "primary"}
          size="small"
          onClick={() => (midiLearnAction ? setMidiLearnAction(null) : startLearn())}
          sx={{ alignSelf: "flex-end" }}
        >
          {midiLearnAction ? t("common.action.cancelLearn") : t("common.action.learn")}
        </Button>
      </Box>

      {midiLearnAction ? (
        <Typography variant="body2" color="warning.main">
          {t("midiMap.pressControl")}
        </Typography>
      ) : null}

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => autoMapNotesToCues(36)}
          disabled={topLevelCues.length === 0}
        >
          {t("midiMap.autoMapNotes")}
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          onClick={() => setMidiMappings([])}
          disabled={midiMappings.length === 0}
        >
          {t("common.action.clearAll")}
        </Button>
      </Box>

      {midiMappings.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("midiMap.noMappings")}
        </Typography>
      ) : (
        <Box
          component="ul"
          sx={{
            listStyle: "none",
            m: 0,
            p: 0,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            maxHeight: 280,
            overflow: "auto",
          }}
        >
          {midiMappings.map((m) => (
            <Box
              component="li"
              key={m.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                py: 0.75,
                px: 1,
                borderRadius: 1,
                bgcolor: "action.hover",
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {formatMidiCue(m.match)}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  → {formatMidiActionLabel(m.action, list.cues)}
                </Typography>
              </Box>
              <Select
                size="small"
                value={m.action.type}
                onChange={(e) => {
                  const type = e.target.value as MidiAction["type"];
                  if (type === "go-cue" || type === "select-cue") {
                    const cueId =
                      m.action.type === type && "cueId" in m.action
                        ? m.action.cueId
                        : topLevelCues[0]?.id;
                    if (cueId) {
                      updateMidiMapping(m.id, {
                        action: { type, cueId },
                      });
                    }
                  } else {
                    updateMidiMapping(m.id, { action: { type } });
                  }
                }}
                sx={{ minWidth: 120, maxWidth: 140 }}
              >
                <MenuItem value="go-selected">{t("midiMap.goSelShort")}</MenuItem>
                <MenuItem value="go-cue">{t("midiMap.goCueShort")}</MenuItem>
                <MenuItem value="select-cue">{t("midiMap.selectShort")}</MenuItem>
                <MenuItem value="panic">{t("midiMap.panic")}</MenuItem>
              </Select>
              {(m.action.type === "go-cue" || m.action.type === "select-cue") && (
                <Select
                  size="small"
                  value={
                    m.action.type === "go-cue" || m.action.type === "select-cue"
                      ? m.action.cueId
                      : ""
                  }
                  onChange={(e) =>
                    updateMidiMapping(m.id, {
                      action: { type: m.action.type, cueId: e.target.value },
                    })
                  }
                  sx={{ minWidth: 100, maxWidth: 120 }}
                >
                  {topLevelCues.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.number}
                    </MenuItem>
                  ))}
                </Select>
              )}
              <Button size="small" color="inherit" onClick={() => removeMidiMapping(m.id)}>
                {t("common.action.remove")}
              </Button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
