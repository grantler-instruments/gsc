import { describe, expect, it } from "vitest";
import {
  isGscProjectDirName,
  isGscProjectDirPath,
  projectDirNameFromShowName,
  projectRootFromSavePath,
} from "./project-paths";

describe("projectDirNameFromShowName", () => {
  it("appends .gsc to the sanitized show name", () => {
    expect(projectDirNameFromShowName("My Show")).toBe("My_Show.gsc");
  });

  it("does not double-append .gsc", () => {
    expect(projectDirNameFromShowName("My_Show.gsc")).toBe("My_Show.gsc");
  });
});

describe("projectRootFromSavePath", () => {
  it("appends .gsc when the user omits it", () => {
    expect(projectRootFromSavePath("/Users/me/Shows/My_Show")).toBe("/Users/me/Shows/My_Show.gsc");
  });

  it("preserves an existing .gsc suffix", () => {
    expect(projectRootFromSavePath("/Users/me/Shows/My_Show.gsc")).toBe(
      "/Users/me/Shows/My_Show.gsc",
    );
  });

  it("strips accidental zip extensions", () => {
    expect(projectRootFromSavePath("/Users/me/Shows/My_Show.gsc.zip")).toBe(
      "/Users/me/Shows/My_Show.gsc",
    );
  });
});

describe("isGscProjectDirPath", () => {
  it("returns true for paths ending in .gsc", () => {
    expect(isGscProjectDirPath("/Users/me/Shows/My_Show.gsc")).toBe(true);
    expect(isGscProjectDirName("My_Show.gsc")).toBe(true);
  });

  it("returns false for plain folders", () => {
    expect(isGscProjectDirPath("/Users/me/Shows/My_Show")).toBe(false);
  });
});
