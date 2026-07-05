import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RecentProjectEntry } from "../lib/recent-projects";
import {
  ensureStartupProjectsDialogVisible,
  refreshStartupProjectsRecents,
  requestStartupProjectsChoice,
  resolveStartupProjectsChoice,
  useStartupProjectsPromptStore,
} from "./startup-projects-prompt";

const initialRecents: RecentProjectEntry[] = [
  { path: "/shows/a", name: "Show A", openedAt: 1 },
  { path: "/shows/b", name: "Show B", openedAt: 2 },
];

const updatedRecents: RecentProjectEntry[] = [{ path: "/shows/b", name: "Show B", openedAt: 2 }];

describe("startup-projects-prompt", () => {
  beforeEach(() => {
    useStartupProjectsPromptStore.setState({
      open: false,
      draft: null,
      recents: [],
      resolve: null,
    });
  });

  afterEach(async () => {
    const { open, resolve } = useStartupProjectsPromptStore.getState();
    if (open && resolve) {
      resolve({ type: "new-show" });
    }
    await Promise.resolve();
    useStartupProjectsPromptStore.setState({
      open: false,
      draft: null,
      recents: [],
      resolve: null,
    });
  });

  it("refreshStartupProjectsRecents updates visible recents while the dialog is open", () => {
    requestStartupProjectsChoice({ draft: null, recents: initialRecents });

    refreshStartupProjectsRecents(updatedRecents);

    expect(useStartupProjectsPromptStore.getState().recents).toEqual(updatedRecents);
  });

  it("refreshStartupProjectsRecents keeps a pending startup choice in sync after remount", () => {
    requestStartupProjectsChoice({ draft: null, recents: initialRecents });
    refreshStartupProjectsRecents(updatedRecents);

    useStartupProjectsPromptStore.setState({ open: false });
    ensureStartupProjectsDialogVisible();

    expect(useStartupProjectsPromptStore.getState()).toMatchObject({
      open: true,
      recents: updatedRecents,
    });
  });
});
