import type { PageSummary } from "./api.js";

/** A folder of pages, with the folders inside it. The root has no name. */
export interface FolderNode {
  /** The folder's own name, e.g. `guides`. Empty for the root. */
  name: string;
  /** Its path from the root, e.g. `docs/guides`. Empty for the root. */
  path: string;
  folders: FolderNode[];
  /** The pages directly in this folder. */
  pages: PageSummary[];
}

const byName = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

/**
 * Groups pages by the folders in their paths, to any depth. A folder exists
 * because a page is in it. Folders come before pages, each in order.
 */
export function groupPages(pages: readonly PageSummary[]): FolderNode {
  const root: FolderNode = { name: "", path: "", folders: [], pages: [] };
  for (const page of pages) {
    const names = page.path.split("/").slice(0, -1);
    let folder = root;
    for (const name of names) {
      const path = folder.path === "" ? name : `${folder.path}/${name}`;
      let next = folder.folders.find((f) => f.name === name);
      if (!next) {
        next = { name, path, folders: [], pages: [] };
        folder.folders.push(next);
      }
      folder = next;
    }
    folder.pages.push(page);
  }
  sortFolder(root);
  return root;
}

function sortFolder(folder: FolderNode): void {
  folder.folders.sort((a, b) => byName(a.name, b.name));
  folder.pages.sort((a, b) => byName(a.path, b.path));
  for (const child of folder.folders) sortFolder(child);
}

/** How many pages are in a folder, including those in the folders inside it. */
export function countPages(folder: FolderNode): number {
  return (
    folder.pages.length +
    folder.folders.reduce((sum, child) => sum + countPages(child), 0)
  );
}

/** A page's file name: the last part of its path. */
export const fileName = (path: string): string =>
  path.slice(path.lastIndexOf("/") + 1);
