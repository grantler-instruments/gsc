import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ASSET_FILE_ACCEPT } from "../lib/cue-asset";
import { useProjectStore } from "../stores/project";
import { useVfsStore } from "../stores/vfs";

export function FixturePlotBackgroundControls() {
  const { t } = useTranslation();
  const fixturePlot = useProjectStore((s) => s.fixturePlot);
  const setFixturePlotBackground = useProjectStore((s) => s.setFixturePlotBackground);
  const entries = useVfsStore((s) => s.entries);
  const importFromFileList = useVfsStore((s) => s.importFromFileList);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageAssets = useMemo(
    () =>
      entries
        .filter((entry) => entry.kind === "image" && entry.loaded)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [entries],
  );

  const handleImport = async (files: FileList | null) => {
    if (!files?.length) return;
    const imported = await importFromFileList(files);
    const firstImage = imported.find((asset) => asset.kind === "image");
    if (firstImage) {
      setFixturePlotBackground(firstImage.path);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      sx={{
        px: 1.5,
        py: 0.75,
        gap: 1,
        alignItems: { sm: "center" },
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
        <InputLabel id="fixture-plot-background-label">{t("fixtures.plotBackground")}</InputLabel>
        <Select
          labelId="fixture-plot-background-label"
          label={t("fixtures.plotBackground")}
          value={fixturePlot.backgroundAssetPath ?? ""}
          onChange={(event) => setFixturePlotBackground(event.target.value || undefined)}
        >
          <MenuItem value="">{t("fixtures.plotBackgroundNone")}</MenuItem>
          {imageAssets.map((entry) => (
            <MenuItem key={entry.path} value={entry.path}>
              {entry.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        size="small"
        variant="outlined"
        onClick={() => fileInputRef.current?.click()}
        sx={{ flexShrink: 0 }}
      >
        {t("fixtures.plotBackgroundImport")}
      </Button>
      <Box
        component="input"
        ref={fileInputRef}
        type="file"
        accept={ASSET_FILE_ACCEPT.image}
        hidden
        onChange={(event) => void handleImport(event.currentTarget.files)}
      />
    </Stack>
  );
}
