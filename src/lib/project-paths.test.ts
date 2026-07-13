import { describe, expect, it } from "vitest";
import {
  enclosingGscProjectDirPath,
  isGscProjectDirName,
  isGscProjectDirPath,
  isInsideGscProjectDir,
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

  it("returns false for reverse-DNS bundle identifier folders", () => {
    expect(isGscProjectDirName("com.grantler-instruments.gsc")).toBe(false);
  });

  it("still treats dotted show names as project folders", () => {
    expect(isGscProjectDirName("My.Show.gsc")).toBe(true);
  });
});

describe("isInsideGscProjectDir", () => {
  it("returns false for a top-level project folder", () => {
    expect(isInsideGscProjectDir("/Users/me/Shows/My_Show.gsc")).toBe(false);
  });

  it("returns true when nested inside another .gsc folder", () => {
    expect(isInsideGscProjectDir("/Users/me/Shows/Existing_Show.gsc/Nested_Show.gsc")).toBe(true);
  });

  it("returns true when nested inside a project assets tree", () => {
    expect(isInsideGscProjectDir("/Users/me/Shows/Existing_Show.gsc/assets/Nested_Show.gsc")).toBe(
      true,
    );
  });

  it("returns false for sibling project folders", () => {
    expect(isInsideGscProjectDir("/Users/me/Shows/Another_Show.gsc")).toBe(false);
  });

  it("returns false for draft paths under the app bundle cache folder", () => {
    expect(
      isInsideGscProjectDir(
        "C:\\Users\\me\\AppData\\Local\\com.grantler-instruments.gsc\\cache\\drafts\\abc\\My_Show.gsc",
      ),
    ).toBe(false);
  });
});

describe("enclosingGscProjectDirPath", () => {
  it("returns the nearest parent .gsc folder", () => {
    expect(enclosingGscProjectDirPath("/Users/me/Shows/Existing_Show.gsc/Nested_Show.gsc")).toBe(
      "/Users/me/Shows/Existing_Show.gsc",
    );
  });

  it("preserves Windows separators", () => {
    expect(enclosingGscProjectDirPath("C:\\Shows\\Existing_Show.gsc\\Nested_Show.gsc")).toBe(
      "C:\\Shows\\Existing_Show.gsc",
    );
  });

  it("returns null for top-level project folders", () => {
    expect(enclosingGscProjectDirPath("/Users/me/Shows/My_Show.gsc")).toBeNull();
  });
});
