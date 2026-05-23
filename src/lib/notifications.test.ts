import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNotificationsStore } from "../stores/notifications";
import {
  notifyErrorDeduped,
  notifyWarningDeduped,
  resetNotificationDedupeForTests,
} from "./notifications";

describe("deduped notifications", () => {
  beforeEach(() => {
    useNotificationsStore.setState({ queue: [] });
    resetNotificationDedupeForTests();
    vi.useFakeTimers({ now: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("notifyWarningDeduped shows once within the window", () => {
    notifyWarningDeduped("test warning", 5000);
    notifyWarningDeduped("test warning", 5000);
    expect(useNotificationsStore.getState().queue).toHaveLength(1);
  });

  it("notifyWarningDeduped shows again after the window", () => {
    notifyWarningDeduped("test warning", 5000);
    vi.setSystemTime(5001);
    notifyWarningDeduped("test warning", 5000);
    expect(useNotificationsStore.getState().queue).toHaveLength(2);
  });

  it("notifyErrorDeduped shows once within the window", () => {
    notifyErrorDeduped("test error", 5000);
    notifyErrorDeduped("test error", 5000);
    expect(useNotificationsStore.getState().queue).toHaveLength(1);
    expect(useNotificationsStore.getState().queue[0]?.severity).toBe("error");
  });
});
