import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "../../stores/project";
import { inspectorFieldLabelSx, inspectorFieldSx } from "../inspectorSx";

interface AudioBusSelectProps {
  value: string | undefined;
  readOnly: boolean;
  onChange: (audioBusId: string | undefined) => void;
}

export function AudioBusSelect({ value, readOnly, onChange }: AudioBusSelectProps) {
  const { t } = useTranslation();
  const audioBuses = useProjectStore((s) => s.audioBuses);

  return (
    <Box sx={inspectorFieldSx}>
      <Typography component="label" sx={inspectorFieldLabelSx}>
        {t("inspector.audioBus")}
      </Typography>
      <Select
        size="small"
        fullWidth
        value={value ?? ""}
        readOnly={readOnly}
        disabled={readOnly}
        displayEmpty
        onChange={(event) => {
          const next = event.target.value;
          onChange(next || undefined);
        }}
      >
        <MenuItem value="">{t("inspector.audioBusDirect")}</MenuItem>
        {audioBuses.map((bus) => (
          <MenuItem key={bus.id} value={bus.id}>
            {bus.name}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
