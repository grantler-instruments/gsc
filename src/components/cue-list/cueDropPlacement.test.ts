import { describe, expect, it } from "vitest";
import { computeContainerRowDropMode, computeInsertPlace } from "./cueDropPlacement";

describe("computeInsertPlace", () => {
  it("returns cached placement when available", () => {
    const event = {
      clientY: 100,
      currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 200 }) },
    };
    expect(computeInsertPlace(event as never, "after")).toBe("after");
  });

  it("derives placement from pointer position when cache is empty", () => {
    const event = {
      clientY: 50,
      currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 200 }) },
    };
    expect(computeInsertPlace(event as never, null)).toBe("before");

    const afterEvent = {
      clientY: 150,
      currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 200 }) },
    };
    expect(computeInsertPlace(afterEvent as never, null)).toBe("after");
  });
});

describe("computeContainerRowDropMode", () => {
  const rect = { top: 0, height: 100 };

  it("uses the top edge for insert-before", () => {
    expect(
      computeContainerRowDropMode(
        { clientY: 10, currentTarget: { getBoundingClientRect: () => rect } } as never,
        null,
      ),
    ).toBe("before");
  });

  it("uses the bottom edge for insert-after", () => {
    expect(
      computeContainerRowDropMode(
        { clientY: 90, currentTarget: { getBoundingClientRect: () => rect } } as never,
        null,
      ),
    ).toBe("after");
  });

  it("uses the middle for drop-into", () => {
    expect(
      computeContainerRowDropMode(
        { clientY: 50, currentTarget: { getBoundingClientRect: () => rect } } as never,
        null,
      ),
    ).toBe("into");
  });
});
