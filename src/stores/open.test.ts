import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openContent } from "./open.js";

const folders: string[] = [];
afterEach(async () => {
  await Promise.all(
    folders.splice(0).map((f) => rm(f, { recursive: true, force: true })),
  );
});
const scratch = async () => {
  const folder = await mkdtemp(join(tmpdir(), "kirigami-open-"));
  folders.push(folder);
  return folder;
};

describe("openContent", () => {
  it("opens a local folder, with its path relative to the base folder", async () => {
    const base = await scratch();
    const opened = openContent(
      { store: "local-folder", path: "./pages" },
      base,
      join(base, "dist"),
    );
    expect(opened.kind).toBe("local-folder");
    expect(opened.dir).toBe(join(base, "pages"));
    await opened.store.write("a.md", "# A\n", null);
    expect((await opened.store.list()).map((e) => e.path)).toEqual(["a.md"]);
  });

  it("does not read the build's output as pages when it is inside the content", async () => {
    const base = await scratch();
    const opened = openContent(
      { store: "local-folder", path: "." },
      base,
      join(base, "dist"),
    );
    await writeFile(join(base, "index.md"), "# Home\n");
    await opened.store.write("dist/old.md", "# Old build\n", null);
    expect(opened.ignore).toContain("dist");
    expect((await opened.store.list()).map((e) => e.path)).toEqual([
      "index.md",
    ]);
  });

  it("always skips .git and node_modules", async () => {
    const base = await scratch();
    const { ignore } = openContent(
      { store: "local-folder", path: "./pages" },
      base,
      join(base, "dist"),
    );
    expect(ignore).toEqual([".git", "node_modules"]);
  });
});
