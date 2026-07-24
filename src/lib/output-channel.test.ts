import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { emit, listen, resetEventBus } = vi.hoisted(() => {
  const listeners = new Map<string, Set<(event: { payload: unknown }) => void>>();

  return {
    emit: vi.fn(async (event: string, payload: unknown) => {
      for (const handler of listeners.get(event) ?? []) {
        handler({ payload });
      }
    }),
    listen: vi.fn(async (event: string, handler: (event: { payload: unknown }) => void) => {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(handler);
      return () => {
        set!.delete(handler);
      };
    }),
    resetEventBus: () => {
      listeners.clear();
    },
  };
});

vi.mock("../platform", () => ({
  getPlatform: vi.fn(() => "web"),
}));

vi.mock("@tauri-apps/api/event", () => ({
  emit: (...args: unknown[]) => emit(...(args as [string, unknown])),
  listen: (...args: unknown[]) =>
    listen(...(args as [string, (event: { payload: unknown }) => void])),
}));

import { getPlatform } from "../platform";
import {
  createOutputChannel,
  isOutputMessage,
  OUTPUT_EVENT_NAME,
  postOutputAsset,
  postOutputState,
  postRequestState,
} from "./output-channel";

const emptyState = {
  revision: 1,
  projectId: "show",
  projectRootDir: null as string | null,
  activeCueIds: [] as string[],
  layers: [],
};

describe("output-channel", () => {
  beforeEach(() => {
    vi.mocked(getPlatform).mockReturnValue("web");
    resetEventBus();
    emit.mockClear();
    listen.mockClear();
  });

  afterEach(() => {
    vi.mocked(getPlatform).mockReturnValue("web");
  });

  it("recognizes state and request-state messages", () => {
    expect(isOutputMessage({ type: "request-state" })).toBe(true);
    expect(isOutputMessage({ type: "state", payload: emptyState })).toBe(true);
  });

  it("requires a Blob for asset messages", () => {
    expect(
      isOutputMessage({
        type: "asset",
        payload: { projectId: "p", assetPath: "video/a.mp4", blob: {} },
      }),
    ).toBe(false);
    expect(
      isOutputMessage({
        type: "asset",
        payload: {
          projectId: "p",
          assetPath: "video/a.mp4",
          blob: new Blob(["x"], { type: "video/mp4" }),
        },
      }),
    ).toBe(true);
  });

  describe("web (BroadcastChannel)", () => {
    it("delivers state between windows", async () => {
      const receiver = createOutputChannel();
      const received = new Promise<unknown>((resolve) => {
        receiver.onmessage = (event) => resolve(event.data);
      });

      const sender = createOutputChannel();
      postOutputState(sender, { ...emptyState, revision: 2, activeCueIds: ["c1"] });

      await expect(received).resolves.toMatchObject({
        type: "state",
        payload: { revision: 2, projectId: "show" },
      });

      sender.close();
      receiver.close();
    });

    it("posts asset messages on the channel API", () => {
      // Node's BroadcastChannel cannot structured-clone Blob; verify the helper wires
      // the message shape that browsers deliver across windows.
      const posted: unknown[] = [];
      const channel = {
        postMessage: (data: unknown) => {
          posted.push(data);
        },
        onmessage: null,
        close: () => {},
        ready: Promise.resolve(),
      };
      const blob = new Blob(["vid"], { type: "video/mp4" });
      postOutputAsset(channel, "show", "video/clip.mp4", blob);

      expect(posted).toEqual([
        {
          type: "asset",
          payload: { projectId: "show", assetPath: "video/clip.mp4", blob },
        },
      ]);
    });

    it("is ready immediately", async () => {
      const channel = createOutputChannel();
      await expect(channel.ready).resolves.toBeUndefined();
      channel.close();
    });
  });

  describe("tauri (emit/listen)", () => {
    beforeEach(() => {
      vi.mocked(getPlatform).mockReturnValue("tauri");
    });

    it("subscribes via listen and becomes ready", async () => {
      const channel = createOutputChannel();
      await channel.ready;

      expect(listen).toHaveBeenCalledWith(OUTPUT_EVENT_NAME, expect.any(Function));
      channel.close();
    });

    it("delivers state from main to output over Tauri events", async () => {
      const output = createOutputChannel();
      await output.ready;

      const received = new Promise<unknown>((resolve) => {
        output.onmessage = (event) => resolve(event.data);
      });

      const main = createOutputChannel();
      await main.ready;
      postOutputState(main, {
        ...emptyState,
        revision: 7,
        projectRootDir: "C:\\Shows\\Demo.gsc",
        activeCueIds: ["video-1"],
      });

      await expect(received).resolves.toEqual({
        type: "state",
        payload: {
          revision: 7,
          projectId: "show",
          projectRootDir: "C:\\Shows\\Demo.gsc",
          activeCueIds: ["video-1"],
          layers: [],
        },
      });
      expect(emit).toHaveBeenCalledWith(OUTPUT_EVENT_NAME, {
        type: "state",
        payload: expect.objectContaining({ revision: 7 }),
      });

      main.close();
      output.close();
    });

    it("delivers request-state from output back to main", async () => {
      const main = createOutputChannel();
      await main.ready;

      const received = new Promise<unknown>((resolve) => {
        main.onmessage = (event) => resolve(event.data);
      });

      const output = createOutputChannel();
      await output.ready;
      postRequestState(output);

      await expect(received).resolves.toEqual({ type: "request-state" });
      expect(emit).toHaveBeenCalledWith(OUTPUT_EVENT_NAME, { type: "request-state" });

      main.close();
      output.close();
    });

    it("refuses asset blob posts (desktop uses disk mode)", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const output = createOutputChannel();
      await output.ready;

      let sawMessage = false;
      output.onmessage = () => {
        sawMessage = true;
      };

      const main = createOutputChannel();
      await main.ready;
      emit.mockClear();

      postOutputAsset(main, "show", "video/clip.mp4", new Blob(["x"], { type: "video/mp4" }));
      await Promise.resolve();

      expect(emit).not.toHaveBeenCalled();
      expect(sawMessage).toBe(false);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("Ignoring asset post on Tauri event channel"),
      );

      warn.mockRestore();
      main.close();
      output.close();
    });

    it("stops receiving after close", async () => {
      const output = createOutputChannel();
      await output.ready;

      let count = 0;
      output.onmessage = () => {
        count += 1;
      };

      const main = createOutputChannel();
      await main.ready;
      postRequestState(main);
      await vi.waitFor(() => {
        expect(count).toBe(1);
      });

      output.close();
      postRequestState(main);
      // Allow any in-flight emit to settle; closed listeners must not fire.
      await emit.mock.results.at(-1)?.value;
      expect(count).toBe(1);

      main.close();
    });
  });
});
