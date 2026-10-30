import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { describeContentStore } from "../../test/store-contract.js";
import { AlreadyExistsError, VersionConflictError } from "../core/index.js";
import { LocalFolderStore } from "./local-folder.js";

const folders: string[] = [];

async function tempFolder(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), "kirigami-store-"));
  folders.push(folder);
  return folder;
}

afterEach(async () => {
  await Promise.all(
    folders.splice(0).map((f) => rm(f, { recursive: true, force: true })),
  );
});

describeContentStore(
  "LocalFolderStore",
  async () => new LocalFolderStore(await tempFolder()),
);

describe("LocalFolderStore", () => {
  it("skips .git and node_modules when listing by default", async () => {
    const folder = await tempFolder();
    const store = new LocalFolderStore(folder);
    await store.write("a.md", "a", null);
    await store.write("node_modules/pkg/readme.md", "x", null);
    await store.write("sub/.git/config", "x", null);
    expect((await store.list()).map((e) => e.path)).toEqual(["a.md"]);
  });

  it("skips the folders named in ignore, and only those", async () => {
    const folder = await tempFolder();
    const store = new LocalFolderStore(folder, ["dist"]);
    await store.write("a.md", "a", null);
    await store.write("dist/out.html", "x", null);
    await store.write("node_modules/p.md", "x", null);
    expect((await store.list()).map((e) => e.path)).toEqual([
      "a.md",
      "node_modules/p.md",
    ]);
  });

  it("lists nothing when the folder does not exist yet", async () => {
    const store = new LocalFolderStore(join(await tempFolder(), "not-created"));
    expect(await store.list()).toEqual([]);
  });

  it("writes plain files that other tools can read", async () => {
    const folder = await tempFolder();
    await new LocalFolderStore(folder).write("blog/a.md", "# Hi\n", null);
    expect(await readFile(join(folder, "blog/a.md"), "utf8")).toBe("# Hi\n");
  });

  it("leaves no temp files behind after an update", async () => {
    const folder = await tempFolder();
    const store = new LocalFolderStore(folder);
    const { version } = await store.write("a.md", "one", null);
    await store.write("a.md", "two", version);
    expect(await readdir(folder)).toEqual(["a.md"]);
  });

  it("sees an edit made outside the CMS as a new version", async () => {
    const folder = await tempFolder();
    const store = new LocalFolderStore(folder);
    const { version } = await store.write("a.md", "one", null);
    await writeFile(join(folder, "a.md"), "edited elsewhere");
    expect((await store.read("a.md")).version).not.toBe(version);
    await expect(store.write("a.md", "mine", version)).rejects.toBeInstanceOf(
      VersionConflictError,
    );
  });

  it("removes the folders a delete leaves empty, but not ones that still hold files", async () => {
    const folder = await tempFolder();
    const store = new LocalFolderStore(folder);
    const deep = await store.write("a/b/deep.md", "x", null);
    const sibling = await store.write("a/sibling.md", "y", null);
    await store.delete("a/b/deep.md", deep.version);
    expect(await readdir(join(folder, "a"))).toEqual(["sibling.md"]);
    await store.delete("a/sibling.md", sibling.version);
    expect(await readdir(folder)).toEqual([]);
  });

  it("removes the folder a rename leaves empty", async () => {
    const folder = await tempFolder();
    const store = new LocalFolderStore(folder);
    const { version } = await store.write("blog/hello.md", "x", null);
    await store.rename("blog/hello.md", "hello.md", version);
    expect(await readdir(folder)).toEqual(["hello.md"]);
  });

  it("treats a folder or a file in the way of the new path as already existing", async () => {
    const folder = await tempFolder();
    const store = new LocalFolderStore(folder);
    const a = await store.write("a.md", "a", null);
    await mkdir(join(folder, "taken.md"));
    await store.write("other.md", "o", null);
    await expect(
      store.rename("a.md", "taken.md", a.version),
    ).rejects.toBeInstanceOf(AlreadyExistsError);
    await expect(
      store.rename("a.md", "other.md/x.md", a.version),
    ).rejects.toBeInstanceOf(AlreadyExistsError);
    expect(await readFile(join(folder, "a.md"), "utf8")).toBe("a");
  });

  it("keeps a file's bytes exactly when renaming, even if they are not valid UTF-8", async () => {
    const folder = await tempFolder();
    const store = new LocalFolderStore(folder);
    const bytes = Buffer.from([0x23, 0x20, 0xff, 0xfe, 0x0a]);
    await writeFile(join(folder, "a.md"), bytes);
    const { version } = await store.read("a.md");
    await store.rename("a.md", "b.md", version);
    expect(await readFile(join(folder, "b.md"))).toEqual(bytes);
  });
});
