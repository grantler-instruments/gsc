import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { clampOscPort } from "../../lib/osc";
import type { Cue, OscCueData } from "../../types/cue";
import { inspectorFieldSx, inspectorGroupHintSx } from "../inspectorSx";
import { OscArgsField } from "../OscArgsField";

interface OscInspectorFieldsProps {
  cue: Cue;
  readOnly: boolean;
  oscDisabled: boolean;
  onPatch: (patch: Partial<OscCueData>) => void;
}

export function OscInspectorFields({
  cue,
  readOnly,
  oscDisabled,
  onPatch,
}: OscInspectorFieldsProps) {
  const { t } = useTranslation();

  if (cue.type !== "osc" || !cue.osc) return null;

  const osc = cue.osc;

  return (
    <>
      {oscDisabled && (
        <Typography component="p" sx={inspectorGroupHintSx}>
          {t("inspector.oscDesktopOnly")}
        </Typography>
      )}

      <Box component="label" sx={inspectorFieldSx}>
        {t("inspector.host")}
        <input
          type="text"
          value={osc.host}
          disabled={readOnly}
          onChange={(e) => onPatch({ host: e.currentTarget.value })}
        />
      </Box>

      <Box component="label" sx={inspectorFieldSx}>
        {t("inspector.port")}
        <input
          type="number"
          min={1}
          max={65535}
          value={osc.port}
          disabled={readOnly}
          onChange={(e) => onPatch({ port: clampOscPort(Number(e.currentTarget.value)) })}
        />
      </Box>

      <Box component="label" sx={inspectorFieldSx}>
        {t("inspector.address")}
        <input
          type="text"
          value={osc.address}
          disabled={readOnly}
          placeholder={t("inspector.oscAddressPlaceholder")}
          onChange={(e) => onPatch({ address: e.currentTarget.value })}
        />
      </Box>

      <OscArgsField
        cueId={cue.id}
        args={osc.args}
        readOnly={readOnly}
        onChange={(args) => onPatch({ args })}
      />
    </>
  );
}
