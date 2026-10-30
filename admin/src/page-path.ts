import { pagesCollidingWith } from "../../src/core/build/collisions.js";
import { InvalidPathError } from "../../src/core/store/errors.js";
import { assertValidPath } from "../../src/core/store/path.js";

/**
 * What a person typed for a page's path, made into one: spaces around it and
 * a leading slash are dropped, and `.md` is added when it is left out.
 */
export function normalizePagePath(input: string): string {
  const path = input.trim().replace(/^\/+/, "");
  return path === "" || path.endsWith(".md") ? path : `${path}.md`;
}

/**
 * Why a path cannot be used for a page, in words for the person, or
 * `undefined` if it can. `others` are the paths of the other pages: the ones
 * a page cannot share a path or an address with (the page being renamed is not
 * among them, since it is leaving its old path).
 */
export function pathProblem(
  path: string,
  others: readonly string[],
): string | undefined {
  if (path === "") return "Enter a path, like blog/hello.md.";
  try {
    assertValidPath(path);
  } catch (error) {
    if (error instanceof InvalidPathError) return error.message;
    throw error;
  }
  if (others.includes(path)) return `A page already exists at ${path}.`;
  const clashes = pagesCollidingWith(path, others);
  if (clashes.length > 0) {
    return `${path} would be shown at the same address as ${clashes.join(" and ")}, so the site would not build.`;
  }
  return undefined;
}

/** A first heading for a new page, made from its file name. */
export function starterContent(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/, "");
  const words = name === "index" ? "Home" : name.replace(/[-_]+/g, " ").trim();
  return `# ${words.charAt(0).toUpperCase()}${words.slice(1)}\n`;
}
