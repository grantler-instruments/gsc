import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  requestDiscardDraftChoice,
  resolveDiscardDraftChoice,
  useDiscardDraftPromptStore,
} from "./discard-draft-prompt";

describe("discard-draft-prompt", () => {
  beforeEach(() => {
    useDiscardDraftPromptStore.setState({
      open: false,
      projectName: "",
      resolve: null,
    });
  });

  afterEach(async () => {
    const { open, resolve } = useDiscardDraftPromptStore.getState();
    if (open && resolve) {
      resolve(false);
    }
    await Promise.resolve();
    useDiscardDraftPromptStore.setState({
      open: false,
      projectName: "",
      resolve: null,
    });
  });

  it("opens with the draft project name", () => {
    requestDiscardDraftChoice("Opening Night");

    expect(useDiscardDraftPromptStore.getState()).toMatchObject({
      open: true,
      projectName: "Opening Night",
    });
  });

  it("resolves confirmed discard and clears state", async () => {
    const choicePromise = requestDiscardDraftChoice("Opening Night");
    resolveDiscardDraftChoice(true);

    await expect(choicePromise).resolves.toBe(true);
    expect(useDiscardDraftPromptStore.getState()).toMatchObject({
      open: false,
      projectName: "",
      resolve: null,
    });
  });
});
