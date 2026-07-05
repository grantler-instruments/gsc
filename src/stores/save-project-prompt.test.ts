import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  requestSaveProjectNowChoice,
  resolveSaveProjectNowChoice,
  useSaveProjectPromptStore,
} from "./save-project-prompt";

describe("save-project-prompt", () => {
  beforeEach(() => {
    useSaveProjectPromptStore.setState({
      open: false,
      projectName: "",
      resolve: null,
    });
  });

  afterEach(async () => {
    const { open, resolve } = useSaveProjectPromptStore.getState();
    if (open && resolve) {
      resolve("later");
    }
    await Promise.resolve();
    useSaveProjectPromptStore.setState({
      open: false,
      projectName: "",
      resolve: null,
    });
  });

  it("opens the prompt with the project name", () => {
    requestSaveProjectNowChoice("Opening Night");

    expect(useSaveProjectPromptStore.getState()).toMatchObject({
      open: true,
      projectName: "Opening Night",
    });
  });

  it("resolves with save and clears state", async () => {
    const choicePromise = requestSaveProjectNowChoice("Opening Night");
    resolveSaveProjectNowChoice("save");

    await expect(choicePromise).resolves.toBe("save");
    expect(useSaveProjectPromptStore.getState()).toMatchObject({
      open: false,
      projectName: "",
      resolve: null,
    });
  });

  it("resolves with later and clears state", async () => {
    const choicePromise = requestSaveProjectNowChoice("Opening Night");
    resolveSaveProjectNowChoice("later");

    await expect(choicePromise).resolves.toBe("later");
    expect(useSaveProjectPromptStore.getState()).toMatchObject({
      open: false,
      projectName: "",
      resolve: null,
    });
  });
});
