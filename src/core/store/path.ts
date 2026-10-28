import { InvalidPathError } from "./errors.js";

/**
 * Store paths are relative, `/`-separated, and cannot climb out of the store.
 * Every store implementation validates with this before touching anything.
 */
export function assertValidPath(path: string): void {
  if (path === "") throw new InvalidPathError(path, "empty");
  if (path.includes("\0"))
    throw new InvalidPathError(path, "contains a NUL character");
  if (path.includes("\\"))
    throw new InvalidPathError(path, "use / as the separator");
  if (path.startsWith("/"))
    throw new InvalidPathError(path, "must be relative");
  for (const segment of path.split("/")) {
    if (segment === "") throw new InvalidPathError(path, "empty segment");
    if (segment === "." || segment === "..") {
      throw new InvalidPathError(path, `"${segment}" segments are not allowed`);
    }
  }
}
