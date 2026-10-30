/**
 * Opaque token identifying one state of a stored file. Compare for equality only.
 */
export type Version = string;

export interface Entry {
  /** Store-relative path, `/`-separated, e.g. `blog/hello.md`. */
  path: string;
  version: Version;
}

export interface Content {
  content: string;
  version: Version;
}

/**
 * Where a site's files live. `core` talks to storage only through this
 * interface and only in strings, so any backend can sit behind it.
 */
export interface ContentStore {
  /** Entries whose path starts with `prefix`, sorted by path. */
  list(prefix?: string): Promise<Entry[]>;

  /** Throws `NotFoundError` if the file does not exist. */
  read(path: string): Promise<Content>;

  /**
   * Writes a file and returns its new version.
   *
   * `expectedVersion` is the version the caller last read, or `null` to
   * require that the file does not exist yet. A mismatch throws
   * `VersionConflictError` and leaves the file untouched.
   */
  write(
    path: string,
    content: string,
    expectedVersion: Version | null,
  ): Promise<{ version: Version }>;

  /**
   * Deletes a file. `expectedVersion` is the version the caller last read.
   * Throws `NotFoundError` if the file does not exist, and
   * `VersionConflictError` (leaving the file) if it changed since.
   */
  delete(path: string, expectedVersion: Version): Promise<void>;

  /**
   * Moves a file to a new path, creating folders as needed, and returns its
   * version (the content is unchanged, so it is the one that was read).
   *
   * Never overwrites: if `to` already exists (or is `from`) it throws
   * `AlreadyExistsError`. Throws `NotFoundError` if `from` does not exist and
   * `VersionConflictError` if `from` changed since `expectedVersion`. In every
   * failure nothing has moved.
   */
  rename(
    from: string,
    to: string,
    expectedVersion: Version,
  ): Promise<{ version: Version }>;
}
