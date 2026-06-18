import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectSnapshot } from "../../types/cue";
import { createImportReport } from "./import-report";
import { resolveAndImportAssets } from "./resolve-assets";

vi.mock("../../vfs/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../vfs/engine")>();
  return {
    ...actual,
    vfsPut: vi.fn(),
    vfsRegisterDiskPath: vi.fn(),
  };
});

vi.mock("../../platform", () => ({
  getPlatform: () => "web" as const,
  isTauri: () => false,
}));

describe("resolveAndImportAssets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("remaps asset paths when folder files are available", async () => {
    const snapshot: ProjectSnapshot = {
      version: 2,
      id: "p1",
      name: "Test",
      activeCueListId: "l1",
      cueLists: [
        {
          id: "l1",
          name: "Main",
          cues: [
            {
              id: "c1",
              number: "1",
              name: "Audio",
              type: "audio",
              assetPath: "audio/clip.wav",
            },
          ],
        },
      ],
    };

    const folderFiles = new Map<string, Uint8Array>([
      ["audio/clip.wav", new Uint8Array([1, 2, 3])],
    ]);

    const report = createImportReport();
    const { snapshot: next } = await resolveAndImportAssets({
      snapshot,
      mediaBaseDir: null,
      folderFiles,
      report,
    });

    expect(next.cueLists[0]?.cues[0]?.assetPath).toBe("/assets/audio/clip.wav");
    expect(report.missingAssets).toHaveLength(0);
  });

  it("finds assets by basename anywhere in a picked folder tree", async () => {
    const snapshot: ProjectSnapshot = {
      version: 2,
      id: "p1",
      name: "Test",
      activeCueListId: "l1",
      cueLists: [
        {
          id: "l1",
          name: "Main",
          cues: [
            {
              id: "c1",
              number: "1",
              name: "Audio",
              type: "audio",
              assetPath: "clip.wav",
            },
          ],
        },
      ],
    };

    const folderFiles = new Map<string, Uint8Array>([
      ["show-folder/samples/clip.wav", new Uint8Array([1, 2, 3])],
    ]);

    const report = createImportReport();
    const { snapshot: next } = await resolveAndImportAssets({
      snapshot,
      mediaBaseDir: null,
      folderFiles,
      report,
    });

    expect(next.cueLists[0]?.cues[0]?.assetPath).toBe("/assets/audio/clip.wav");
    expect(report.missingAssets).toHaveLength(0);
  });

  it("records missing assets when files are unavailable", async () => {
    const snapshot: ProjectSnapshot = {
      version: 2,
      id: "p1",
      name: "Test",
      activeCueListId: "l1",
      cueLists: [
        {
          id: "l1",
          name: "Main",
          cues: [
            {
              id: "c1",
              number: "1",
              name: "Audio",
              type: "audio",
              assetPath: "audio/missing.wav",
            },
          ],
        },
      ],
    };

    const report = createImportReport();
    await resolveAndImportAssets({
      snapshot,
      mediaBaseDir: null,
      report,
    });

    expect(report.missingAssets).toContain("audio/missing.wav");
  });
});
