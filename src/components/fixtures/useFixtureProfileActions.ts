import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { tryGetActiveProjectId } from "../../lib/active-project-id";
import { getCachedAsset } from "../../lib/asset-cache";
import {
  buildFixturesProfileZip,
  downloadFixturesProfile,
  FIXTURES_PROFILE_EXTENSION,
  type FixtureProfileFile,
  type FixturesProfileImportMode,
  hydrateFixtureProfiles,
  type ParsedFixturesProfile,
  parseFixturesProfileZip,
  prepareFixturesProfileImport,
} from "../../lib/fixture-profile";
import { notifyErrorFromUnknown } from "../../lib/notifications";
import { collectOflPaths } from "../../lib/ofl/import-ofl";
import { useProjectStore } from "../../stores/project";
import { useVfsStore } from "../../stores/vfs";
import type { Fixture } from "../../types/fixture";
import { vfsGet } from "../../vfs/engine";

interface PendingFixtureProfileImport {
  snapshot: ParsedFixturesProfile;
  profiles: FixtureProfileFile[];
}

export function useFixtureProfileActions(
  canEdit: boolean,
  fixtures: Fixture[],
  projectName: string,
  onImported: (firstFixtureId: string) => void,
) {
  const { t } = useTranslation();
  const fixturePlot = useProjectStore((s) => s.fixturePlot);
  const importFixturesProfile = useProjectStore((s) => s.importFixturesProfile);
  const syncVfsFromEngine = useVfsStore((s) => s.syncFromEngine);
  const profileImportRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<PendingFixtureProfileImport | null>(null);

  const existingOflPaths = useMemo(() => collectOflPaths(fixtures), [fixtures]);

  const readProfileBlob = useCallback(async (path: string) => {
    const fromVfs = vfsGet(path);
    if (fromVfs) return fromVfs;
    const projectId = tryGetActiveProjectId();
    if (!projectId) return undefined;
    return getCachedAsset(projectId, path);
  }, []);

  const applyImport = useCallback(
    async (pending: PendingFixtureProfileImport, mode: FixturesProfileImportMode) => {
      const prepared = prepareFixturesProfileImport(
        pending.snapshot,
        pending.profiles,
        fixtures,
        existingOflPaths,
        mode,
      );
      await hydrateFixtureProfiles(prepared.profiles);
      importFixturesProfile(prepared.fixtures, prepared.fixturePlot, mode);
      syncVfsFromEngine();
      const firstId =
        mode === "replace"
          ? prepared.fixtures[0]?.id
          : (prepared.fixtures[0]?.id ?? fixtures[0]?.id);
      if (firstId) {
        onImported(firstId);
      }
    },
    [existingOflPaths, fixtures, importFixturesProfile, onImported, syncVfsFromEngine],
  );

  const handleExportProfile = useCallback(async () => {
    if (!canEdit) return;
    try {
      const { zip, missing } = await buildFixturesProfileZip(
        fixtures,
        fixturePlot,
        readProfileBlob,
        { name: projectName },
      );
      if (missing.length > 0) {
        throw new Error(t("fixtures.missingProfiles", { count: missing.length }));
      }
      downloadFixturesProfile(zip, `${projectName}-venue-rig`);
    } catch (err) {
      notifyErrorFromUnknown(err);
    }
  }, [canEdit, fixturePlot, fixtures, projectName, readProfileBlob, t]);

  const handleImportProfileClick = useCallback(() => {
    profileImportRef.current?.click();
  }, []);

  const handleImportProfileFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !canEdit) return;

      try {
        const data = new Uint8Array(await file.arrayBuffer());
        const { snapshot, profiles } = parseFixturesProfileZip(data);
        if (snapshot.fixtures.length === 0) {
          throw new Error(t("fixtures.importProfileEmpty"));
        }

        if (fixtures.length > 0) {
          setPendingImport({ snapshot, profiles });
          return;
        }

        await applyImport({ snapshot, profiles }, "merge");
      } catch (err) {
        notifyErrorFromUnknown(err);
      }
    },
    [applyImport, canEdit, fixtures.length, t],
  );

  const handleImportCancel = useCallback(() => {
    setPendingImport(null);
  }, []);

  const handleImportMerge = useCallback(async () => {
    if (!pendingImport) return;
    const pending = pendingImport;
    setPendingImport(null);
    try {
      await applyImport(pending, "merge");
    } catch (err) {
      notifyErrorFromUnknown(err);
    }
  }, [applyImport, pendingImport]);

  const handleImportReplace = useCallback(async () => {
    if (!pendingImport) return;
    const pending = pendingImport;
    setPendingImport(null);
    try {
      await applyImport(pending, "replace");
    } catch (err) {
      notifyErrorFromUnknown(err);
    }
  }, [applyImport, pendingImport]);

  return {
    existingOflPaths,
    profileImportRef,
    handleExportProfile,
    handleImportProfileClick,
    handleImportProfileFile,
    profileImportAccept: `${FIXTURES_PROFILE_EXTENSION},application/zip`,
    importDialogOpen: pendingImport !== null,
    importDialogProfileName: pendingImport?.snapshot.name,
    importDialogFixtureCount: pendingImport?.snapshot.fixtures.length ?? 0,
    importDialogHasPlot: Boolean(pendingImport?.snapshot.fixturePlot),
    handleImportCancel,
    handleImportMerge,
    handleImportReplace,
  };
}
