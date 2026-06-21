import { describe, expect, it } from "vitest";
import { experimentalWebAppUrl } from "./experimental-web-url";

describe("experimentalWebAppUrl", () => {
  it("links into the experimental subpath from the stable site base", () => {
    expect(experimentalWebAppUrl("/gsc/")).toBe("/gsc/experimental/app/");
  });

  it("links to app/ when already on the experimental site base", () => {
    expect(experimentalWebAppUrl("/gsc/experimental/")).toBe("/gsc/experimental/app/");
  });
});
