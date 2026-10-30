import { describe, expect, it } from "vitest";
import {
  AlreadyExistsError,
  type ContentStore,
  InvalidPathError,
  NotFoundError,
  VersionConflictError,
} from "../src/core/index.js";

/**
 * Behaviour every ContentStore must have. Call from each implementation's test
 * file with a factory that returns a fresh, empty store.
 */
export function describeContentStore(
  name: string,
  create: () => Promise<ContentStore>,
): void {
  describe(`${name} (ContentStore contract)`, () => {
    it("creates a file and reads it back", async () => {
      const store = await create();
      const { version } = await store.write("a.md", "hello", null);
      expect(await store.read("a.md")).toEqual({ content: "hello", version });
    });

    it("keeps content byte-for-byte", async () => {
      const store = await create();
      const content =
        "# Title\r\n\r\n  trailing spaces  \n\n\n- é ✓ \u{1F600}\n";
      await store.write("a.md", content, null);
      expect((await store.read("a.md")).content).toBe(content);
    });

    it("creates parent folders on write", async () => {
      const store = await create();
      await store.write("blog/2026/post.md", "x", null);
      expect((await store.read("blog/2026/post.md")).content).toBe("x");
    });

    it("throws NotFoundError for a missing file", async () => {
      const store = await create();
      await expect(store.read("missing.md")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("updates with the current version and changes the version", async () => {
      const store = await create();
      const first = await store.write("a.md", "one", null);
      const second = await store.write("a.md", "two", first.version);
      expect(second.version).not.toBe(first.version);
      expect(await store.read("a.md")).toEqual({
        content: "two",
        version: second.version,
      });
    });

    it("rejects a stale version and leaves the file untouched", async () => {
      const store = await create();
      const first = await store.write("a.md", "one", null);
      await store.write("a.md", "two", first.version);
      await expect(
        store.write("a.md", "three", first.version),
      ).rejects.toBeInstanceOf(VersionConflictError);
      expect((await store.read("a.md")).content).toBe("two");
    });

    it("rejects creating a file that already exists", async () => {
      const store = await create();
      await store.write("a.md", "one", null);
      await expect(store.write("a.md", "two", null)).rejects.toBeInstanceOf(
        VersionConflictError,
      );
      expect((await store.read("a.md")).content).toBe("one");
    });

    it("rejects updating a file that does not exist", async () => {
      const store = await create();
      await expect(store.write("a.md", "x", "1")).rejects.toBeInstanceOf(
        VersionConflictError,
      );
    });

    it("lists entries sorted by path, with their versions", async () => {
      const store = await create();
      const b = await store.write("b.md", "b", null);
      const a = await store.write("blog/a.md", "a", null);
      expect(await store.list()).toEqual([
        { path: "b.md", version: b.version },
        { path: "blog/a.md", version: a.version },
      ]);
    });

    it("lists only paths under a prefix", async () => {
      const store = await create();
      await store.write("b.md", "b", null);
      await store.write("blog/a.md", "a", null);
      expect((await store.list("blog/")).map((e) => e.path)).toEqual([
        "blog/a.md",
      ]);
    });

    it("lists nothing for an empty store", async () => {
      const store = await create();
      expect(await store.list()).toEqual([]);
    });

    it("deletes a file", async () => {
      const store = await create();
      const { version } = await store.write("a.md", "x", null);
      await store.delete("a.md", version);
      await expect(store.read("a.md")).rejects.toBeInstanceOf(NotFoundError);
      expect(await store.list()).toEqual([]);
    });

    it("keeps the other files when deleting one", async () => {
      const store = await create();
      const a = await store.write("blog/a.md", "a", null);
      const b = await store.write("blog/b.md", "b", null);
      await store.delete("blog/a.md", a.version);
      expect(await store.list()).toEqual([
        { path: "blog/b.md", version: b.version },
      ]);
    });

    it("throws NotFoundError when deleting a missing file", async () => {
      const store = await create();
      await expect(store.delete("a.md", "1")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("refuses to delete a stale version and keeps the file", async () => {
      const store = await create();
      const first = await store.write("a.md", "one", null);
      await store.write("a.md", "two", first.version);
      await expect(store.delete("a.md", first.version)).rejects.toBeInstanceOf(
        VersionConflictError,
      );
      expect((await store.read("a.md")).content).toBe("two");
    });

    it("moves a file to a new path, keeping its content and version", async () => {
      const store = await create();
      const { version } = await store.write("a.md", "same", null);
      const moved = await store.rename("a.md", "b.md", version);
      expect(moved.version).toBe(version);
      await expect(store.read("a.md")).rejects.toBeInstanceOf(NotFoundError);
      expect(await store.read("b.md")).toEqual({ content: "same", version });
    });

    it("creates folders for the new path, and keeps content byte-for-byte", async () => {
      const store = await create();
      const content = "# T\r\n\r\n  é ✓ \n\n";
      const { version } = await store.write("a.md", content, null);
      await store.rename("a.md", "blog/2026/a.md", version);
      expect((await store.read("blog/2026/a.md")).content).toBe(content);
    });

    it("moves a file out of a folder and into another", async () => {
      const store = await create();
      const { version } = await store.write("blog/a.md", "x", null);
      await store.rename("blog/a.md", "notes/a.md", version);
      expect((await store.list()).map((e) => e.path)).toEqual(["notes/a.md"]);
    });

    it("never overwrites: renaming onto an existing file throws AlreadyExistsError", async () => {
      const store = await create();
      const a = await store.write("a.md", "a", null);
      const b = await store.write("b.md", "b", null);
      await expect(
        store.rename("a.md", "b.md", a.version),
      ).rejects.toBeInstanceOf(AlreadyExistsError);
      expect(await store.read("a.md")).toEqual({
        content: "a",
        version: a.version,
      });
      expect(await store.read("b.md")).toEqual({
        content: "b",
        version: b.version,
      });
    });

    it("treats renaming a file onto itself as already existing", async () => {
      const store = await create();
      const { version } = await store.write("a.md", "a", null);
      await expect(
        store.rename("a.md", "a.md", version),
      ).rejects.toBeInstanceOf(AlreadyExistsError);
      expect((await store.read("a.md")).content).toBe("a");
    });

    it("throws NotFoundError when renaming a missing file", async () => {
      const store = await create();
      await expect(store.rename("a.md", "b.md", "1")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("refuses to rename a stale version and moves nothing", async () => {
      const store = await create();
      const first = await store.write("a.md", "one", null);
      await store.write("a.md", "two", first.version);
      await expect(
        store.rename("a.md", "b.md", first.version),
      ).rejects.toBeInstanceOf(VersionConflictError);
      expect((await store.list()).map((e) => e.path)).toEqual(["a.md"]);
    });

    it("rejects a rename or delete with an invalid path", async () => {
      const store = await create();
      const { version } = await store.write("a.md", "x", null);
      await expect(
        store.rename("a.md", "../b.md", version),
      ).rejects.toBeInstanceOf(InvalidPathError);
      await expect(
        store.rename("../a.md", "b.md", version),
      ).rejects.toBeInstanceOf(InvalidPathError);
      await expect(store.delete("/a.md", version)).rejects.toBeInstanceOf(
        InvalidPathError,
      );
      expect((await store.list()).map((e) => e.path)).toEqual(["a.md"]);
    });

    it.each([
      "",
      "/abs.md",
      "../escape.md",
      "a/../b.md",
      "a//b.md",
      "./a.md",
      "a\\b.md",
    ])("rejects the invalid path %j", async (path) => {
      const store = await create();
      await expect(store.read(path)).rejects.toBeInstanceOf(InvalidPathError);
      await expect(store.write(path, "x", null)).rejects.toBeInstanceOf(
        InvalidPathError,
      );
    });
  });
}
