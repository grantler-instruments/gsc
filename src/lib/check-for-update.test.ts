import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNotificationsStore } from "../stores/notifications";
import { usePreferencesStore } from "../stores/preferences";
import { checkForUpdate } from "./check-for-update";

vi.mock("./app-version", () => ({
  APP_VERSION: "0.0.4",
}));

vi.mock("./fetch-latest-github-tag", () => ({
  fetchLatestGitHubTag: vi.fn(),
}));

import { fetchLatestGitHubTag } from "./fetch-latest-github-tag";

describe("checkForUpdate", () => {
  beforeEach(() => {
    useNotificationsStore.setState({ queue: [] });
    usePreferencesStore.setState({
      acknowledgedUpdateVersion: null,
      acknowledgedUpdateAtVersion: null,
    });
    vi.mocked(fetchLatestGitHubTag).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("notifies when a newer tag exists", async () => {
    vi.mocked(fetchLatestGitHubTag).mockResolvedValue("0.0.8");

    await checkForUpdate();

    const queue = useNotificationsStore.getState().queue;
    expect(queue).toHaveLength(1);
    expect(queue[0]?.message).toContain("0.0.8");
    expect(queue[0]?.action?.href).toContain("/releases/tag/0.0.8");
    expect(queue[0]?.updateVersion).toBe("0.0.8");
  });

  it("does not notify when already on the latest version", async () => {
    vi.mocked(fetchLatestGitHubTag).mockResolvedValue("0.0.4");

    await checkForUpdate();

    expect(useNotificationsStore.getState().queue).toHaveLength(0);
  });

  it("does not notify when the update was already acknowledged on this app version", async () => {
    usePreferencesStore.setState({
      acknowledgedUpdateVersion: "0.0.7",
      acknowledgedUpdateAtVersion: "0.0.4",
    });
    vi.mocked(fetchLatestGitHubTag).mockResolvedValue("0.0.7");

    await checkForUpdate();

    expect(useNotificationsStore.getState().queue).toHaveLength(0);
  });

  it("notifies again when the app version changed after dismissal", async () => {
    usePreferencesStore.setState({
      acknowledgedUpdateVersion: "0.0.7",
      acknowledgedUpdateAtVersion: "0.0.7",
    });
    vi.mocked(fetchLatestGitHubTag).mockResolvedValue("0.0.7");

    await checkForUpdate();

    expect(useNotificationsStore.getState().queue).toHaveLength(1);
  });
});
