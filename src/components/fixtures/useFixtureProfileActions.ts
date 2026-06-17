import { useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { tryGetActiveProjectId } from "../../lib/active-project-id";
import { getCachedAsset } from "../../lib/asset-cache";
import {
  buildFixturesProfileZip,
  downloadFixturesProfile,
  FIXTURES_PROFILE_EXTENSION,
  hydrateFixtureProfiles,
  parseFixturesProfileZip,
  prepareFixturesProfileImport,
} from "../../lib/fixture-profile";
import { notifyErrorFromUnknown } from "../../lib/notifications";
import { collectOflPaths } from "../../lib/ofl/import-ofl";
import { useProjectStore } from "../../stores/project";
import { useVfsStore } from "../../stores/vfs";
import type { Fixture } from "../../types/fixture";
import { vfsGet } from "../../vfs/engine";

export function useFixtureProfileActions(
  canEdit: boolean,
  fixtures: Fixture[],
  projectName: string,
  onImported: (firstFixtureId: string) => void,
) {
  const { t } = useTranslation();
  const appendFixtures = useProjectStore((s) => s.appendFixtures);
  const syncVfsFromEngine = useVfsStore((s) => s.syncFromEngine);
  const profileImportRef = useRef<HTMLInputElement>(null);

  const existingOflPaths = useMemo(() => collectOflPaths(fixtures), [fixtures]);

  const readProfileBlob = useCallback(async (path: string) => {
    const fromVfs = vfsGet(path);
    if (fromVfs) return fromVfs;
    const projectId = tryGetActiveProjectId();
    if (!projectId) return undefined;
    return getCachedAsset(projectId, path);
  }, []);

  const handleExportProfile = useCallback(async () => {
    if (!canEdit) return;
    try {
      const { zip, missing } = await buildFixturesProfileZip(fixtures, readProfileBlob);
      if (missing.length > 0) {
        throw new Error(t("fixtures.missingProfiles", { count: missing.length }));
      }
      downloadFixturesProfile(zip, `${projectName}-fixtures`);
    } catch (err) {
      notifyErrorFromUnknown(err);
    }
  }, [canEdit, fixtures, projectName, readProfileBlob, t]);

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
        const prepared = prepareFixturesProfileImport(
          snapshot,
          profiles,
          fixtures,
          existingOflPaths,
        );
        await hydrateFixtureProfiles(prepared.profiles);
        appendFixtures(prepared.fixtures);
        syncVfsFromEngine();
        if (prepared.fixtures[0]) {
          onImported(prepared.fixtures[0].id);
        }
      } catch (err) {
        notifyErrorFromUnknown(err);
      }
    },
    [appendFixtures, canEdit, existingOflPaths, fixtures, onImported, syncVfsFromEngine],
  );

  return {
    existingOflPaths,
    profileImportRef,
    handleExportProfile,
    handleImportProfileClick,
    handleImportProfileFile,
    profileImportAccept: `${FIXTURES_PROFILE_EXTENSION},application/zip`,
  };
}
