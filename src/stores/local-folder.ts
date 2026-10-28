import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
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
