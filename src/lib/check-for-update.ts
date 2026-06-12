import i18n from "../i18n";
import { usePreferencesStore } from "../stores/preferences";
import { APP_VERSION } from "./app-version";
import { compareSemver } from "./compare-semver";
import { fetchLatestGitHubTag } from "./fetch-latest-github-tag";
import { notify } from "./notifications";
import { githubReleaseUrl } from "./support-links";

/** Check GitHub tags once; notify when a newer release is available. */
export async function checkForUpdate(): Promise<void> {
  const latest = await fetchLatestGitHubTag();
  if (!latest || compareSemver(latest, APP_VERSION) <= 0) return;

  const { acknowledgedUpdateVersion, acknowledgedUpdateAtVersion } = usePreferencesStore.getState();
  if (acknowledgedUpdateVersion === latest && acknowledgedUpdateAtVersion === APP_VERSION) {
    return;
  }

  notify(i18n.t("update.available", { latest, current: APP_VERSION }), "info", {
    action: {
      label: i18n.t("update.viewRelease"),
      href: githubReleaseUrl(latest),
    },
    updateVersion: latest,
  });
}
