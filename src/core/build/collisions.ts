import { outputPath } from "../render/paths.js";

/** Pages that would be written to the same output file. */
export interface Collision {
  /** The output file they would share, e.g. `about/index.html`. */
  target: string;
  /** The source pages, e.g. `about.md` and `about/index.md`. */
  pages: string[];
}

/** Every group of pages that would be written to the same output file. */
export function findCollisions(pages: readonly string[]): Collision[] {
  const byTarget = new Map<string, string[]>();
  for (const page of pages) {
    const target = outputPath(page);
    byTarget.set(target, [...(byTarget.get(target) ?? []), page]);
  }
  return [...byTarget]
    .filter(([, sources]) => sources.length > 1)
    .map(([target, sources]) => ({ target, pages: sources }));
}

/**
 * The pages (other than `path` itself) that would be written to the same
 * output file as `path`. Use it to ask, before creating or renaming a page,
 * whether the build would refuse the result.
 */
export function pagesCollidingWith(
  path: string,
  pages: readonly string[],
): string[] {
  const target = outputPath(path);
  return pages.filter((page) => page !== path && outputPath(page) === target);
}
