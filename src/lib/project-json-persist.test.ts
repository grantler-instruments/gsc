import { describe, expect, it } from "vitest";
import {
  type ProjectJsonFsOps,
  projectJsonOrBakExists,
  projectJsonPaths,
  readProjectJsonWithBackup,
  writeProjectJsonSafely,
} from "./project-json-persist";

const ROOT = "/Shows/Demo.gsc";
const paths = projectJsonPaths(ROOT);

function createMemoryFs(initial: Record<string, string> = {}): {
  files: Map<string, string>;
  ops: ProjectJsonFsOps;
} {
  const files = new Map(Object.entries(initial));
  const ops: ProjectJsonFsOps = {
    exists: async (path) => files.has(path),
    copyFile: async (from, to) => {
      const data = files.get(from);
      if (data === undefined) throw new Error(`missing ${from}`);
      files.set(to, data);
    },
    rename: async (from, to) => {
      const data = files.get(from);
      if (data === undefined) throw new Error(`missing ${from}`);
      files.set(to, data);
      files.delete(from);
    },
    writeTextFile: async (path, contents) => {
      files.set(path, contents);
    },
    readTextFile: async (path) => {
      const data = files.get(path);
      if (data === undefined) throw new Error(`missing ${path}`);
      return data;
    },
    remove: async (path) => {
      files.delete(path);
    },
  };
  return { files, ops };
}

const v2 = (name: string) => JSON.stringify({ version: 2, id: "p1", name, cueLists: [] }, null, 2);

const v1 = JSON.stringify({ version: 1, name: "Legacy" });

describe("projectJsonPaths", () => {
  it("joins with forward slashes for unix roots", () => {
    expect(projectJsonPaths("/Shows/Demo.gsc")).toEqual({
      primary: "/Shows/Demo.gsc/project.json",
      bak: "/Shows/Demo.gsc/project.json.bak",
      tmp: "/Shows/Demo.gsc/project.json.tmp",
      bakTmp: "/Shows/Demo.gsc/project.json.bak.tmp",
    });
  });

  it("joins with backslashes for windows roots", () => {
    expect(projectJsonPaths("C:\\Shows\\Demo.gsc")).toEqual({
      primary: "C:\\Shows\\Demo.gsc\\project.json",
      bak: "C:\\Shows\\Demo.gsc\\project.json.bak",
      tmp: "C:\\Shows\\Demo.gsc\\project.json.tmp",
      bakTmp: "C:\\Shows\\Demo.gsc\\project.json.bak.tmp",
    });
  });
});

describe("writeProjectJsonSafely", () => {
  it("writes primary without bak on first save", async () => {
    const { files, ops } = createMemoryFs();
    const body = v2("First");

    await writeProjectJsonSafely(ROOT, body, ops);

    expect(files.get(paths.primary)).toBe(body);
    expect(files.has(paths.bak)).toBe(false);
    expect(files.has(paths.tmp)).toBe(false);
    expect(files.has(paths.bakTmp)).toBe(false);
  });

  it("rolls previous primary into bak on second save", async () => {
    const first = v2("First");
    const second = v2("Second");
    const { files, ops } = createMemoryFs({ [paths.primary]: first });

    await writeProjectJsonSafely(ROOT, second, ops);

    expect(files.get(paths.primary)).toBe(second);
    expect(files.get(paths.bak)).toBe(first);
    expect(files.has(paths.tmp)).toBe(false);
    expect(files.has(paths.bakTmp)).toBe(false);
  });

  it("keeps a rolling bak across later saves and never deletes it", async () => {
    const first = v2("First");
    const second = v2("Second");
    const third = v2("Third");
    const { files, ops } = createMemoryFs({ [paths.primary]: first });

    await writeProjectJsonSafely(ROOT, second, ops);
    expect(files.get(paths.bak)).toBe(first);

    await writeProjectJsonSafely(ROOT, third, ops);
    expect(files.get(paths.primary)).toBe(third);
    expect(files.get(paths.bak)).toBe(second);
    expect(files.has(paths.bak)).toBe(true);
  });

  it("leaves primary intact when bak copy fails", async () => {
    const first = v2("First");
    const { files, ops } = createMemoryFs({ [paths.primary]: first });
    ops.copyFile = async () => {
      throw new Error("crash during bak copy");
    };

    await expect(writeProjectJsonSafely(ROOT, v2("Second"), ops)).rejects.toThrow(
      "crash during bak copy",
    );

    expect(files.get(paths.primary)).toBe(first);
    expect(files.has(paths.bak)).toBe(false);
    expect(files.has(paths.tmp)).toBe(false);
  });

  it("leaves primary intact when bak rename fails", async () => {
    const first = v2("First");
    const { files, ops } = createMemoryFs({ [paths.primary]: first });
    const baseRename = ops.rename;
    ops.rename = async (from, to) => {
      if (from === paths.bakTmp) throw new Error("crash during bak rename");
      return baseRename(from, to);
    };

    await expect(writeProjectJsonSafely(ROOT, v2("Second"), ops)).rejects.toThrow(
      "crash during bak rename",
    );

    expect(files.get(paths.primary)).toBe(first);
    expect(files.has(paths.bak)).toBe(false);
    expect(files.get(paths.bakTmp)).toBe(first);
    expect(files.has(paths.tmp)).toBe(false);
  });

  it("leaves primary intact when tmp write fails", async () => {
    const first = v2("First");
    const { files, ops } = createMemoryFs({ [paths.primary]: first });
    ops.writeTextFile = async (path) => {
      if (path === paths.tmp) throw new Error("crash during tmp write");
      files.set(path, "");
    };

    await expect(writeProjectJsonSafely(ROOT, v2("Second"), ops)).rejects.toThrow(
      "crash during tmp write",
    );

    expect(files.get(paths.primary)).toBe(first);
    expect(files.get(paths.bak)).toBe(first);
    expect(files.has(paths.tmp)).toBe(false);
  });

  it("leaves previous primary intact when final rename fails (tmp may remain)", async () => {
    const first = v2("First");
    const second = v2("Second");
    const { files, ops } = createMemoryFs({ [paths.primary]: first });
    const baseRename = ops.rename;
    ops.rename = async (from, to) => {
      if (from === paths.tmp && to === paths.primary) {
        throw new Error("crash during final rename");
      }
      return baseRename(from, to);
    };

    await expect(writeProjectJsonSafely(ROOT, second, ops)).rejects.toThrow(
      "crash during final rename",
    );

    expect(files.get(paths.primary)).toBe(first);
    expect(files.get(paths.bak)).toBe(first);
    expect(files.get(paths.tmp)).toBe(second);
  });

  it("recovers from a stray tmp left by a previous crash", async () => {
    const first = v2("First");
    const second = v2("Second");
    const { files, ops } = createMemoryFs({
      [paths.primary]: first,
      [paths.tmp]: '{"version":2,"name":',
    });

    await writeProjectJsonSafely(ROOT, second, ops);

    expect(files.get(paths.primary)).toBe(second);
    expect(files.get(paths.bak)).toBe(first);
    expect(files.has(paths.tmp)).toBe(false);
  });

  it("succeeds without a remove implementation", async () => {
    const first = v2("First");
    const second = v2("Second");
    const { files, ops } = createMemoryFs({ [paths.primary]: first });
    delete ops.remove;

    await writeProjectJsonSafely(ROOT, second, ops);

    expect(files.get(paths.primary)).toBe(second);
    expect(files.get(paths.bak)).toBe(first);
  });

  it("ignores cleanup failures after a successful write", async () => {
    const first = v2("First");
    const second = v2("Second");
    const { files, ops } = createMemoryFs({ [paths.primary]: first });
    ops.remove = async () => {
      throw new Error("cleanup failed");
    };

    await expect(writeProjectJsonSafely(ROOT, second, ops)).resolves.toBeUndefined();

    expect(files.get(paths.primary)).toBe(second);
    expect(files.get(paths.bak)).toBe(first);
  });
});

describe("readProjectJsonWithBackup", () => {
  it("reads a healthy primary", async () => {
    const body = v2("Show");
    const { ops } = createMemoryFs({ [paths.primary]: body });

    const result = await readProjectJsonWithBackup(ROOT, ops);

    expect(result).toMatchObject({ source: "primary", text: body });
    expect(result?.snap.name).toBe("Show");
  });

  it("prefers a healthy primary when bak also exists", async () => {
    const primary = v2("Current");
    const bak = v2("Older");
    const { ops } = createMemoryFs({
      [paths.primary]: primary,
      [paths.bak]: bak,
    });

    const result = await readProjectJsonWithBackup(ROOT, ops);

    expect(result).toMatchObject({ source: "primary", text: primary });
    expect(result?.snap.name).toBe("Current");
  });

  it("falls back to bak when primary is truncated", async () => {
    const bak = v2("Backup");
    const { ops } = createMemoryFs({
      [paths.primary]: '{"version":2,"name":',
      [paths.bak]: bak,
    });

    const result = await readProjectJsonWithBackup(ROOT, ops);

    expect(result).toMatchObject({ source: "backup", text: bak });
    expect(result?.snap.name).toBe("Backup");
  });

  it("falls back to bak when primary has unsupported version", async () => {
    const bak = v2("Backup");
    const { ops } = createMemoryFs({
      [paths.primary]: v1,
      [paths.bak]: bak,
    });

    const result = await readProjectJsonWithBackup(ROOT, ops);

    expect(result?.source).toBe("backup");
    expect(result?.snap.name).toBe("Backup");
  });

  it("falls back to bak when reading primary throws", async () => {
    const bak = v2("Backup");
    const files = new Map([
      [paths.primary, v2("Broken")],
      [paths.bak, bak],
    ]);
    const ops: Pick<ProjectJsonFsOps, "exists" | "readTextFile"> = {
      exists: async (path) => files.has(path),
      readTextFile: async (path) => {
        if (path === paths.primary) throw new Error("I/O error");
        const data = files.get(path);
        if (data === undefined) throw new Error(`missing ${path}`);
        return data;
      },
    };

    const result = await readProjectJsonWithBackup(ROOT, ops);

    expect(result?.source).toBe("backup");
    expect(result?.snap.name).toBe("Backup");
  });

  it("falls back to bak when primary is missing", async () => {
    const bak = v2("OnlyBak");
    const { ops } = createMemoryFs({ [paths.bak]: bak });

    const result = await readProjectJsonWithBackup(ROOT, ops);

    expect(result?.source).toBe("backup");
    expect(result?.snap.name).toBe("OnlyBak");
  });

  it("returns null when both are unusable", async () => {
    const { ops } = createMemoryFs({
      [paths.primary]: "{not-json",
      [paths.bak]: v1,
    });

    await expect(readProjectJsonWithBackup(ROOT, ops)).resolves.toBeNull();
  });

  it("returns null when only a truncated bak exists", async () => {
    const { ops } = createMemoryFs({
      [paths.bak]: '{"version":2,"name":',
    });

    await expect(readProjectJsonWithBackup(ROOT, ops)).resolves.toBeNull();
  });

  it("returns null when neither file exists", async () => {
    const { ops } = createMemoryFs();

    await expect(readProjectJsonWithBackup(ROOT, ops)).resolves.toBeNull();
  });
});

describe("corrupt primary recovery flow", () => {
  it("rewrites primary from bak without promoting corrupt bytes into bak", async () => {
    const bak = v2("Backup");
    const corrupt = '{"version":2,"name":';
    const { files, ops } = createMemoryFs({
      [paths.primary]: corrupt,
      [paths.bak]: bak,
    });

    const loaded = await readProjectJsonWithBackup(ROOT, ops);
    expect(loaded?.source).toBe("backup");

    // Mirror loadProjectFromFolder: drop corrupt primary, then rewrite safely.
    await ops.remove?.(paths.primary);
    await writeProjectJsonSafely(ROOT, loaded!.text, ops);

    expect(files.get(paths.primary)).toBe(bak);
    expect(files.get(paths.bak)).toBe(bak);

    const after = await readProjectJsonWithBackup(ROOT, ops);
    expect(after?.source).toBe("primary");
    expect(after?.snap.name).toBe("Backup");
  });

  it("would clobber bak if corrupt primary is not removed first", async () => {
    const bak = v2("Backup");
    const corrupt = '{"version":2,"name":';
    const { files, ops } = createMemoryFs({
      [paths.primary]: corrupt,
      [paths.bak]: bak,
    });

    await writeProjectJsonSafely(ROOT, bak, ops);

    expect(files.get(paths.primary)).toBe(bak);
    expect(files.get(paths.bak)).toBe(corrupt);
  });
});

describe("projectJsonOrBakExists", () => {
  it("is true when only primary exists", async () => {
    const exists = async (path: string) => path === paths.primary;
    await expect(projectJsonOrBakExists(ROOT, exists)).resolves.toBe(true);
  });

  it("is true when only bak exists", async () => {
    const exists = async (path: string) => path === paths.bak;
    await expect(projectJsonOrBakExists(ROOT, exists)).resolves.toBe(true);
  });

  it("is true when both exist", async () => {
    const exists = async () => true;
    await expect(projectJsonOrBakExists(ROOT, exists)).resolves.toBe(true);
  });

  it("is false when neither exists", async () => {
    const exists = async () => false;
    await expect(projectJsonOrBakExists(ROOT, exists)).resolves.toBe(false);
  });
});
