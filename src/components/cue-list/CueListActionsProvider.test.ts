import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import * as sharedContext from "./cueListActionsContext";

function Consumer() {
  const { listId, canEdit, allCues } = sharedContext.useCueListActions();
  return createElement("span", null, `${listId}:${canEdit}:${allCues.length}`);
}

afterEach(() => {
  vi.doUnmock("./cueListActionsContext");
  vi.resetModules();
});

it("keeps existing consumers connected when the provider module reloads", async () => {
  // Model Fast Refresh: the provider is re-evaluated while mounted consumers
  // retain their reference to the shared context module.
  vi.doMock("./cueListActionsContext", () => sharedContext);
  const before = await import("./CueListActionsProvider");
  vi.resetModules();
  const after = await import("./CueListActionsProvider");
  expect(after.CueListActionsProvider).not.toBe(before.CueListActionsProvider);

  const Provider = after.CueListActionsProvider;
  const hotProps = {
    canEdit: false,
    listId: "hot",
    allCues: [],
    runningSequences: {},
    hot: true,
    children: createElement(Consumer),
  };
  const mainProps = {
    canEdit: true,
    listId: "main",
    allCues: [],
    runningSequences: {},
    children: [
      createElement(Consumer, { key: "main" }),
      createElement(Provider, { ...hotProps, key: "hot" }),
    ],
  };
  expect(renderToStaticMarkup(createElement(Provider, mainProps))).toBe(
    "<span>main:true:0</span><span>hot:false:0</span>",
  );
});

it("still reports consumers rendered without any provider", () => {
  expect(() => renderToStaticMarkup(createElement(Consumer))).toThrow(
    "useCueListActions must be used within CueListActionsProvider",
  );
});
