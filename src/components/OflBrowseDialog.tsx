import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { notifyErrorFromUnknown } from "../lib/notifications";
import {
  filterOflCatalog,
  formatOflCatalogEntryDetail,
  formatOflCatalogEntryLabel,
  loadOflCatalog,
} from "../lib/ofl/catalog";
import { parseOflFixtureJson } from "../lib/ofl/client";
import {
  OFL_ALL_CATEGORIES,
  OFL_ALL_MANUFACTURERS,
  OFL_FIXTURE_CATEGORIES,
  oflFixturePageUrl,
  oflFixtureRawUrl,
} from "../lib/ofl/constants";
import { importOflFixtureJson } from "../lib/ofl/import-ofl";
import type {
  OflCatalogEntry,
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

function catalogEntryKey(entry: Pick<OflCatalogEntry, "manufacturerKey" | "fixtureKey">): string {
  return `${entry.manufacturerKey}/${entry.fixtureKey}`;
}

export function OflBrowseDialog({
  open,
  existingPaths,
  onClose,
  onImported,
}: OflBrowseDialogProps) {
  const { t } = useTranslation();
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingFixture, setLoadingFixture] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState(0);
  const [enrichTotal, setEnrichTotal] = useState(0);
  const [categoriesReady, setCategoriesReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manufacturers, setManufacturers] = useState<OflManufacturer[]>([]);
  const [catalog, setCatalog] = useState<OflCatalogEntry[]>([]);
  const [manufacturerKey, setManufacturerKey] = useState(OFL_ALL_MANUFACTURERS);
  const [category, setCategory] = useState(OFL_ALL_CATEGORIES);
  const [query, setQuery] = useState("");
  const [selectedEntryKey, setSelectedEntryKey] = useState<string | null>(null);
  const [pendingSummary, setPendingSummary] = useState<OflFixtureSummary | null>(null);
  const [pendingRaw, setPendingRaw] = useState<unknown>(null);
  const [modeName, setModeName] = useState("");

  const filteredFixtures = useMemo(
    () =>
      filterOflCatalog(catalog, {
        query,
        manufacturerKey,
        category: categoriesReady ? category : OFL_ALL_CATEGORIES,
      }),
    [catalog, categoriesReady, category, manufacturerKey, query],
  );

  const selectedEntry = useMemo(
    () => catalog.find((entry) => catalogEntryKey(entry) === selectedEntryKey) ?? null,
    [catalog, selectedEntryKey],
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
    setManufacturerKey(OFL_ALL_MANUFACTURERS);
    setCategory(OFL_ALL_CATEGORIES);
    setSelectedEntryKey(null);
    setPendingSummary(null);
    setPendingRaw(null);
    setModeName("");
    setCatalog([]);
    setManufacturers([]);
    setEnrichProgress(0);
    setEnrichTotal(0);
    setCategoriesReady(false);
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

    void loadOflCatalog({
      onListLoaded: (entries) => {
        if (cancelled) return;
        setCatalog(entries);
        setEnrichTotal(entries.length);
        setLoadingCatalog(false);
      },
      onProgress: (loaded, total) => {
        if (cancelled) return;
        setEnrichProgress(loaded);
        setEnrichTotal(total);
        if (loaded >= total) {
          setCategoriesReady(true);
        }
      },
    })
      .then(({ manufacturers: loadedManufacturers, catalog: enrichedCatalog }) => {
        if (cancelled) return;
        setManufacturers(loadedManufacturers);
        setCatalog(enrichedCatalog);
        setCategoriesReady(true);
        setEnrichProgress(enrichedCatalog.length);
        setEnrichTotal(enrichedCatalog.length);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("ofl.loadCatalogError"));
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, resetDialog, t]);

  const handleSelectFixture = async (entry: OflCatalogEntry) => {
    setSelectedEntryKey(catalogEntryKey(entry));
    setLoadingFixture(true);
    setError(null);
    try {
      const response = await fetch(oflFixtureRawUrl(entry.manufacturerKey, entry.fixtureKey));
      if (!response.ok) {
        throw new Error(
          t("ofl.fixtureError", {
            manufacturer: entry.manufacturerKey,
            fixture: entry.fixtureKey,
            status: response.status,
          }),
        );
      }
      const raw = await response.json();
      const summary = parseOflFixtureJson(
        entry.manufacturerKey,
        entry.manufacturerName,
        entry.fixtureKey,
        raw,
      );
      setPendingRaw(raw);
      setPendingSummary(summary);
      setModeName(summary.modes[0]?.name ?? "");
    } catch (err) {
      notifyErrorFromUnknown(err);
      setError(err instanceof Error ? err.message : t("ofl.loadFixtureError"));
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
      setError(err instanceof Error ? err.message : t("ofl.importFixtureError"));
    } finally {
      setLoadingFixture(false);
    }
  };

  const statusMessage = loadingCatalog
    ? t("ofl.loadingCatalog")
    : categoriesReady
      ? t("ofl.catalogStatusReady", {
          shown: filteredFixtures.length,
          total: catalog.length,
        })
      : t("ofl.catalogStatusLoadingTypes", {
          shown: filteredFixtures.length,
          total: catalog.length,
          loaded: enrichProgress,
          count: enrichTotal,
        });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{t("ofl.title")}</DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          pt: 1,
          minHeight: 520,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ m: 0 }}>
          {t("ofl.description")}
        </Typography>

        {loadingCatalog && catalog.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <TextField
              label={t("ofl.searchFixtures")}
              size="small"
              value={query}
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("ofl.searchPlaceholder")}
            />

            <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1 }}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel id="ofl-category-label">{t("ofl.fixtureType")}</InputLabel>
                <Select
                  labelId="ofl-category-label"
                  label={t("ofl.fixtureType")}
                  value={category}
                  disabled={!categoriesReady}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <MenuItem value={OFL_ALL_CATEGORIES}>{t("ofl.allTypes")}</MenuItem>
                  {OFL_FIXTURE_CATEGORIES.map((entry) => (
                    <MenuItem key={entry} value={entry}>
                      {entry}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel id="ofl-manufacturer-label">{t("ofl.manufacturer")}</InputLabel>
                <Select
                  labelId="ofl-manufacturer-label"
                  label={t("ofl.manufacturer")}
                  value={manufacturerKey}
                  onChange={(event) => setManufacturerKey(event.target.value)}
                >
                  <MenuItem value={OFL_ALL_MANUFACTURERS}>{t("ofl.allManufacturers")}</MenuItem>
                  {manufacturers.map((manufacturer) => (
                    <MenuItem key={manufacturer.key} value={manufacturer.key}>
                      {manufacturer.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ m: 0 }}>
              {statusMessage}
            </Typography>

            <Stack
              direction={{ xs: "column", md: "row" }}
              sx={{ gap: 1.5, flex: 1, minHeight: 300 }}
            >
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  overflow: "auto",
                  minHeight: 280,
                }}
              >
                {filteredFixtures.length === 0 && (
                  <Typography sx={{ p: 2, m: 0, color: "text.secondary", fontSize: 13 }}>
                    {t("ofl.noMatches")}
                  </Typography>
                )}
                {filteredFixtures.map((entry) => {
                  const selected = catalogEntryKey(entry) === selectedEntryKey;
                  return (
                    <Box
                      key={catalogEntryKey(entry)}
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
                      <Typography
                        noWrap
                        sx={{ fontSize: 13, m: 0, fontWeight: selected ? 600 : 400 }}
                      >
                        {formatOflCatalogEntryLabel(entry)}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: 11, m: 0, color: "text.secondary" }}>
                        {formatOflCatalogEntryDetail(entry)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              <Box
                sx={{
                  width: { xs: "100%", md: 300 },
                  flexShrink: 0,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  minHeight: 280,
                }}
              >
                {loadingFixture && !pendingSummary ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : pendingSummary && selectedEntry ? (
                  <>
                    <Typography variant="subtitle2" sx={{ m: 0 }}>
                      {pendingSummary.manufacturer} {pendingSummary.name}
                    </Typography>
                    {pendingSummary.categories && pendingSummary.categories.length > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ m: 0 }}>
                        {pendingSummary.categories.join(" · ")}
                      </Typography>
                    )}
                    <Link
                      href={oflFixturePageUrl(
                        pendingSummary.manufacturerKey,
                        pendingSummary.fixtureKey,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      variant="caption"
                    >
                      {t("ofl.viewOnSite")}
                    </Link>
                    <Box component="label" sx={{ ...inspectorFieldSx, mt: 0.5 }}>
                      <Typography component="span" sx={inspectorFieldLabelSx}>
                        {t("fixtures.dmxMode")}
                      </Typography>
                      <Select
                        size="small"
                        fullWidth
                        value={modeName}
                        onChange={(event) => setModeName(event.target.value)}
                      >
                        {pendingSummary.modes.map((mode) => (
                          <MenuItem key={mode.name} value={mode.name}>
                            {t("ofl.dmxModeLabel", {
                              name: mode.name,
                              shortName: mode.shortName ?? mode.name,
                              count: mode.channelCount,
                            })}
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>
                    {selectedMode && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ m: 0, lineHeight: 1.4 }}
                      >
                        {selectedMode.channels.map((channel) => channel.key).join(", ")}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ m: 0 }}>
                    {t("ofl.selectFixtureHint")}
                  </Typography>
                )}
              </Box>
            </Stack>
          </>
        )}

        {error && (
          <Typography variant="body2" color="error" sx={{ m: 0 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.action.cancel")}</Button>
        <Button
          variant="contained"
          disabled={!pendingSummary || !selectedMode || loadingFixture}
          onClick={() => void handleConfirmImport()}
        >
          {loadingFixture ? t("common.action.importing") : t("ofl.addFixture")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
