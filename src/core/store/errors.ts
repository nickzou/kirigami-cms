export class NotFoundError extends Error {
  constructor(readonly path: string) {
    super(`No such file: ${path}`);
    this.name = "NotFoundError";
  }
}

export class VersionConflictError extends Error {
  constructor(readonly path: string) {
    super(`${path} changed since it was read (or already exists)`);
    this.name = "VersionConflictError";
  }
}

export class InvalidPathError extends Error {
  constructor(
    readonly path: string,
    reason: string,
  ) {
    super(`Invalid path "${path}": ${reason}`);
    this.name = "InvalidPathError";
  }
}

/** A rename's destination is already taken. Nothing was moved or overwritten. */
export class AlreadyExistsError extends Error {
  constructor(readonly path: string) {
    super(`${path} already exists`);
    this.name = "AlreadyExistsError";
  }
}
