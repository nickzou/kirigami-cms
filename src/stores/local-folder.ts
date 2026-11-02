import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join, posix } from "node:path";
import {
  AlreadyExistsError,
  assertValidPath,
  type Content,
  type ContentStore,
  type Entry,
  NotFoundError,
  type Version,
  VersionConflictError,
} from "../core/index.js";

const versionOf = (content: string): Version =>
  createHash("sha256").update(content).digest("hex");

const hasCode = (error: unknown, code: string): boolean =>
  error instanceof Error && (error as NodeJS.ErrnoException).code === code;

/**
 * A content store backed by a folder on disk. A file's version is the hash of
 * its content, so edits made outside the CMS change the version too.
 */
export class LocalFolderStore implements ContentStore {
  /** The end of each path's queue of changes (see `exclusively`). */
  private readonly queues = new Map<string, Promise<unknown>>();

  /**
   * `ignore` names folders that `list` skips wherever they appear. Reading and
   * writing a path inside one still works.
   */
  constructor(
    private readonly root: string,
    private readonly ignore: readonly string[] = [".git", "node_modules"],
  ) {}

  async list(prefix = ""): Promise<Entry[]> {
    const paths = await this.walk("");
    const entries = await Promise.all(
      paths
        .filter((path) => path.startsWith(prefix))
        .map(async (path) => ({
          path,
          version: versionOf(await this.readRaw(path)),
        })),
    );
    return entries.sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
    );
  }

  async read(path: string): Promise<Content> {
    assertValidPath(path);
    const content = await this.readRaw(path);
    return { content, version: versionOf(content) };
  }

  async write(
    path: string,
    content: string,
    expectedVersion: Version | null,
  ): Promise<{ version: Version }> {
    assertValidPath(path);
    return this.exclusively([path], () =>
      this.writeNow(path, content, expectedVersion),
    );
  }

  private async writeNow(
    path: string,
    content: string,
    expectedVersion: Version | null,
  ): Promise<{ version: Version }> {
    const file = join(this.root, path);
    await mkdir(dirname(file), { recursive: true });

    if (expectedVersion === null) {
      try {
        await writeFile(file, content, { flag: "wx" });
      } catch (error) {
        if (hasCode(error, "EEXIST")) throw new VersionConflictError(path);
        throw error;
      }
      return { version: versionOf(content) };
    }

    let current: string;
    try {
      current = await this.readRaw(path);
    } catch (error) {
      if (error instanceof NotFoundError) throw new VersionConflictError(path);
      throw error;
    }
    if (versionOf(current) !== expectedVersion)
      throw new VersionConflictError(path);

    // Write beside the target, then rename, so readers never see a half-written file.
    const temp = `${file}.${randomUUID()}.tmp`;
    await writeFile(temp, content);
    await rename(temp, file);
    return { version: versionOf(content) };
  }

  async delete(path: string, expectedVersion: Version): Promise<void> {
    assertValidPath(path);
    return this.exclusively([path], () =>
      this.deleteNow(path, expectedVersion),
    );
  }

  private async deleteNow(
    path: string,
    expectedVersion: Version,
  ): Promise<void> {
    const current = await this.readRaw(path);
    if (versionOf(current) !== expectedVersion)
      throw new VersionConflictError(path);
    try {
      await unlink(join(this.root, path));
    } catch (error) {
      if (hasCode(error, "ENOENT")) throw new NotFoundError(path);
      throw error;
    }
    await this.removeEmptyFolders(path);
  }

  async rename(
    from: string,
    to: string,
    expectedVersion: Version,
  ): Promise<{ version: Version }> {
    assertValidPath(from);
    assertValidPath(to);
    return this.exclusively([from, to], () =>
      this.renameNow(from, to, expectedVersion),
    );
  }

  private async renameNow(
    from: string,
    to: string,
    expectedVersion: Version,
  ): Promise<{ version: Version }> {
    const current = await this.readRaw(from);
    if (versionOf(current) !== expectedVersion)
      throw new VersionConflictError(from);

    try {
      await mkdir(dirname(join(this.root, to)), { recursive: true });
    } catch (error) {
      // A file is in the way of the new folder, so the destination is taken.
      if (hasCode(error, "EEXIST") || hasCode(error, "ENOTDIR"))
        throw new AlreadyExistsError(to);
      throw error;
    }
    try {
      // Copy, refusing to overwrite, then remove the original: unlike a plain
      // rename, this can never replace a file that is already at `to`.
      await copyFile(
        join(this.root, from),
        join(this.root, to),
        constants.COPYFILE_EXCL,
      );
    } catch (error) {
      if (hasCode(error, "EEXIST") || hasCode(error, "EISDIR"))
        throw new AlreadyExistsError(to);
      if (hasCode(error, "ENOENT")) throw new NotFoundError(from);
      throw error;
    }
    try {
      await unlink(join(this.root, from));
    } catch (error) {
      if (!hasCode(error, "ENOENT")) throw error;
    }
    await this.removeEmptyFolders(from);
    return { version: versionOf(current) };
  }

  /**
   * Runs `change` once no other change to any of `paths` is running, so the
   * check of the expected version and the write that follows it are one step
   * (two saves that both pass the check can no longer both go through). This
   * holds within this process only: another program writing the file in the
   * same few milliseconds is not excluded, but the content-hash version still
   * catches any edit made before the check.
   *
   * Each path has a queue; a change waits at the end of every queue it needs.
   * It joins them all at once (no waiting in between), so two changes that
   * share paths in a different order cannot wait on each other.
   */
  private exclusively<T>(
    paths: readonly string[],
    change: () => Promise<T>,
  ): Promise<T> {
    const keys = [...new Set(paths)];
    const ahead = keys.map((key) => this.queues.get(key) ?? Promise.resolve());
    const run = Promise.all(ahead.map((p) => p.catch(() => {}))).then(change);
    const done = run.catch(() => {});
    for (const key of keys) {
      this.queues.set(key, done);
      // Forget the queue once it is empty, so the map does not grow forever.
      void done.then(() => {
        if (this.queues.get(key) === done) this.queues.delete(key);
      });
    }
    return run;
  }

  /** Removes the folders a file leaves empty, up to (not including) the root. */
  private async removeEmptyFolders(path: string): Promise<void> {
    let folder = posix.dirname(path);
    while (folder !== ".") {
      try {
        await rmdir(join(this.root, folder));
      } catch {
        return; // not empty (or already gone): stop here
      }
      folder = posix.dirname(folder);
    }
  }

  private async readRaw(path: string): Promise<string> {
    try {
      return await readFile(join(this.root, path), "utf8");
    } catch (error) {
      if (hasCode(error, "ENOENT") || hasCode(error, "EISDIR"))
        throw new NotFoundError(path);
      throw error;
    }
  }

  private async walk(dir: string): Promise<string[]> {
    let names: import("node:fs").Dirent[];
    try {
      names = await readdir(join(this.root, dir), { withFileTypes: true });
    } catch (error) {
      if (hasCode(error, "ENOENT")) return [];
      throw error;
    }
    const nested = await Promise.all(
      names.map((entry) => {
        const path = dir === "" ? entry.name : `${dir}/${entry.name}`;
        return entry.isDirectory()
          ? this.ignore.includes(entry.name)
            ? []
            : this.walk(path)
          : entry.isFile()
            ? [path]
            : [];
      }),
    );
    return nested.flat();
  }
}
