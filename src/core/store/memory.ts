import { NotFoundError, VersionConflictError } from "./errors.js";
import { assertValidPath } from "./path.js";
import type { Content, ContentStore, Entry, Version } from "./types.js";

/** In-memory store for tests and tooling. Versions are a per-store counter. */
export class MemoryStore implements ContentStore {
  private readonly files = new Map<string, Content>();
  private counter = 0;

  constructor(initial: Record<string, string> = {}) {
    for (const [path, content] of Object.entries(initial)) {
      assertValidPath(path);
      this.files.set(path, { content, version: this.nextVersion() });
    }
  }

  async list(prefix = ""): Promise<Entry[]> {
    return [...this.files]
      .filter(([path]) => path.startsWith(prefix))
      .map(([path, { version }]) => ({ path, version }))
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }

  async read(path: string): Promise<Content> {
    assertValidPath(path);
    const file = this.files.get(path);
    if (!file) throw new NotFoundError(path);
    return { ...file };
  }

  async write(
    path: string,
    content: string,
    expectedVersion: Version | null,
  ): Promise<{ version: Version }> {
    assertValidPath(path);
    const current = this.files.get(path);
    if ((current?.version ?? null) !== expectedVersion)
      throw new VersionConflictError(path);
    const version = this.nextVersion();
    this.files.set(path, { content, version });
    return { version };
  }

  private nextVersion(): Version {
    this.counter += 1;
    return String(this.counter);
  }
}
