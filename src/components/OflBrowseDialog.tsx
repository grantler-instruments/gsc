import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo, useState } from "react";
import { notifyErrorFromUnknown } from "../lib/notifications";
import {
  fetchOflFixtureList,
  fetchOflManufacturers,
  filterOflFixtureList,
  parseOflFixtureJson,
} from "../lib/ofl/client";
import { oflFixturePageUrl, oflFixtureRawUrl } from "../lib/ofl/constants";
import { importOflFixtureJson } from "../lib/ofl/import-ofl";
import type {
  OflFixtureListEntry,
  OflFixtureSummary,
  OflManufacturer,
  OflModeSummary,
} from "../lib/ofl/types";
import { inspectorFieldLabelSx, inspectorFieldSx } from "./inspectorSx";

export interface OflBrowseImportPayload {
  path: string;
  fileName: string;
  summary: OflFixtureSummary;
  mode: OflModeSummary;
}

interface OflBrowseDialogProps {
  open: boolean;
  existingPaths: string[];
  onClose: () => void;
  onImported: (payload: OflBrowseImportPayload) => void;
}

export function OflBrowseDialog({
  open,
  existingPaths,
  onClose,
  onImported,
}: OflBrowseDialogProps) {
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [loadingFixture, setLoadingFixture] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manufacturers, setManufacturers] = useState<OflManufacturer[]>([]);
  const [manufacturerKey, setManufacturerKey] = useState("");
  const [fixtureEntries, setFixtureEntries] = useState<OflFixtureListEntry[]>([]);
  const [query, setQuery] = useState("");
  const [pendingSummary, setPendingSummary] = useState<OflFixtureSummary | null>(null);
  const [pendingRaw, setPendingRaw] = useState<unknown>(null);
  const [modeName, setModeName] = useState("");

  const selectedManufacturer = useMemo(
    () => manufacturers.find((entry) => entry.key === manufacturerKey) ?? null,
    [manufacturers, manufacturerKey],
  );

  const filteredFixtures = useMemo(
    () => filterOflFixtureList(fixtureEntries, query),
    [fixtureEntries, query],
  );

  const selectedMode = useMemo(
    () =>
      pendingSummary?.modes.find((mode) => mode.name === modeName) ??
      pendingSummary?.modes[0] ??
      null,
    [pendingSummary, modeName],
  );

  const resetDialog = useCallback(() => {
    setError(null);
    setQuery("");
    setPendingSummary(null);
    setPendingRaw(null);
    setModeName("");
    setFixtureEntries([]);
    setLoadingFixture(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetDialog();
      return;
    }

    let cancelled = false;
    setLoadingCatalog(true);
    setError(null);

    void fetchOflManufacturers()
      .then((loaded) => {
        if (cancelled) return;
        setManufacturers(loaded);
        setManufacturerKey(loaded[0]?.key ?? "");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load OFL catalog.");
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, resetDialog]);

  useEffect(() => {
    if (!open || !manufacturerKey) return;

    let cancelled = false;
    setLoadingFixtures(true);
    setError(null);
    setPendingSummary(null);
    setPendingRaw(null);
    setModeName("");

    void fetchOflFixtureList(manufacturerKey)
      .then((entries) => {
        if (cancelled) return;
        setFixtureEntries(entries);
      })
      .catch((err) => {
        if (cancelled) return;
        setFixtureEntries([]);
        setError(err instanceof Error ? err.message : "Could not load fixtures.");
      })
      .finally(() => {
        if (!cancelled) setLoadingFixtures(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, manufacturerKey]);

  const handleSelectFixture = async (entry: OflFixtureListEntry) => {
    if (!selectedManufacturer) return;
    setLoadingFixture(true);
    setError(null);
    try {
      const response = await fetch(oflFixtureRawUrl(entry.manufacturerKey, entry.fixtureKey));
      if (!response.ok) {
        throw new Error(`Could not load ${entry.fixtureKey} (${response.status})`);
      }
      const raw = await response.json();
      const summary = parseOflFixtureJson(
        entry.manufacturerKey,
        selectedManufacturer.name,
        entry.fixtureKey,
        raw,
      );
      setPendingRaw(raw);
      setPendingSummary(summary);
      setModeName(summary.modes[0]?.name ?? "");
    } catch (err) {
      notifyErrorFromUnknown(err);
      setError(err instanceof Error ? err.message : "Could not load fixture.");
    } finally {
      setLoadingFixture(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingSummary || !selectedMode || pendingRaw == null) return;
    setLoadingFixture(true);
    setError(null);
    try {
      const imported = await importOflFixtureJson(
        pendingSummary.manufacturerKey,
        pendingSummary.manufacturer,
        pendingSummary.fixtureKey,
        pendingRaw,
        existingPaths,
      );

      onImported({
        path: imported.path,
        fileName: imported.fileName,
        summary: imported.summary,
        mode: selectedMode,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import fixture.");
    } finally {
      setLoadingFixture(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Open Fixture Library</DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          pt: 1,
          minHeight: 420,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ m: 0 }}>
          Browse fixtures from{" "}
          <Link href="https://open-fixture-library.org/" target="_blank" rel="noreferrer">
            open-fixture-library.org
          </Link>
          .
        </Typography>

        {loadingCatalog ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <Stack direction="row" sx={{ gap: 1 }}>
              <Box component="label" sx={{ ...inspectorFieldSx, minWidth: 180 }}>
                <Typography component="span" sx={inspectorFieldLabelSx}>
                  Manufacturer
                </Typography>
                <Select
                  size="small"
                  fullWidth
                  value={manufacturerKey}
                  onChange={(event) => setManufacturerKey(event.target.value)}
                >
                  {manufacturers.map((manufacturer) => (
                    <MenuItem key={manufacturer.key} value={manufacturer.key}>
                      {manufacturer.name}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
              <TextField
                label="Search fixtures"
                size="small"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                sx={{ flex: 1 }}
              />
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ m: 0 }}>
              {loadingFixtures
                ? "Loading fixtures…"
                : `${filteredFixtures.length} fixture${filteredFixtures.length === 1 ? "" : "s"}`}
            </Typography>

            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                overflow: "auto",
                flex: 1,
                minHeight: 220,
                maxHeight: 280,
              }}
            >
              {!loadingFixtures && filteredFixtures.length === 0 && (
                <Typography sx={{ p: 2, m: 0, color: "text.secondary", fontSize: 13 }}>
                  No fixtures match your search.
                </Typography>
              )}
              {filteredFixtures.map((entry) => {
                const selected =
                  pendingSummary?.fixtureKey === entry.fixtureKey &&
                  pendingSummary.manufacturerKey === entry.manufacturerKey;
                return (
                  <Box
                    key={entry.fixtureKey}
                    onClick={() => void handleSelectFixture(entry)}
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderBottom: 1,
                      borderColor: "divider",
                      cursor: "pointer",
                      bgcolor: selected ? "action.selected" : "transparent",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Typography noWrap sx={{ fontSize: 13, m: 0 }}>
                      {entry.name}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 11, m: 0, color: "text.secondary" }}>
                      {entry.fixtureKey}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            {pendingSummary && (
              <>
                <Typography variant="body2" sx={{ m: 0 }}>
                  {pendingSummary.manufacturer} {pendingSummary.name}
                </Typography>
                <Link
                  href={oflFixturePageUrl(
                    pendingSummary.manufacturerKey,
                    pendingSummary.fixtureKey,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  variant="caption"
                >
                  View on open-fixture-library.org
                </Link>
                <Box component="label" sx={inspectorFieldSx}>
                  <Typography component="span" sx={inspectorFieldLabelSx}>
                    DMX mode
                  </Typography>
                  <Select
                    size="small"
                    fullWidth
                    value={modeName}
                    onChange={(event) => setModeName(event.target.value)}
                  >
                    {pendingSummary.modes.map((mode) => (
                      <MenuItem key={mode.name} value={mode.name}>
                        {mode.shortName ? `${mode.name} (${mode.shortName})` : mode.name} ·{" "}
                        {mode.channelCount} ch
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
                {selectedMode && (
                  <Typography variant="caption" color="text.secondary" sx={{ m: 0 }}>
                    {selectedMode.channels.map((channel) => channel.key).join(", ")}
                  </Typography>
                )}
              </>
            )}
          </>
        )}

        {error && (
          <Typography variant="body2" color="error" sx={{ m: 0 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!pendingSummary || !selectedMode || loadingFixture}
          onClick={() => void handleConfirmImport()}
        >
          {loadingFixture ? "Importing…" : "Add fixture"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
