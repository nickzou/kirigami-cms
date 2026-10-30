import { ChevronRight } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Link } from "react-router";
import type { PageSummary } from "../../api.js";
import {
  countPages,
  type FolderNode,
  fileName,
  groupPages,
} from "../../page-tree.js";
import { Button } from "../Button/Button.js";

/** The address of a page's editor, with each path segment encoded. */
export const pageHref = (path: string): string =>
  `/pages/${path.split("/").map(encodeURIComponent).join("/")}`;

export interface PageListViewProps {
  pages: readonly PageSummary[];
  /** When given, each row has a Rename button. */
  onRename?: (page: PageSummary) => void;
  /** When given, each row has a Delete button. */
  onDelete?: (page: PageSummary) => void;
}

/** How far a row is pushed in for each level of folder it is inside. */
const indent = (depth: number): string => `${1 + depth * 1.5}rem`;

/** A safe `id` for a folder, whatever characters its name has (a space would split `aria-controls`). */
const folderId = (prefix: string, path: string): string =>
  `${prefix}-${[...path].map((c) => c.codePointAt(0)?.toString(16)).join("-")}`;

/**
 * The site's pages, grouped under their folders. Each folder is a row that
 * opens and closes on its own; they start open, so nothing is hidden until you
 * close it. A folder exists because a page is in it. At each level the pages
 * come first and the folders after them.
 */
export function PageListView({ pages, onRename, onDelete }: PageListViewProps) {
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const tree = useMemo(() => groupPages(pages), [pages]);
  const idPrefix = useId();

  if (pages.length === 0)
    return <p className=":uno: text-muted">This site has no pages yet.</p>;

  const toggle = (path: string) =>
    setClosed((current) => {
      const next = new Set(current);
      if (!next.delete(path)) next.add(path);
      return next;
    });

  const renderFolder = (folder: FolderNode, depth: number) => (
    // The first row's top border is cut off by the box this sits in (-mt-px),
    // so every row can draw its own and none doubles up.
    <ul
      className={
        depth === 0
          ? ":uno: mx-0 mb-0 -mt-px list-none p-0"
          : ":uno: m-0 list-none p-0"
      }
    >
      {folder.pages.map((page) => (
        <li
          key={page.path}
          className=":uno: flex items-center [border-top:1px_solid_var(--border)]"
        >
          <Link
            to={pageHref(page.path)}
            style={{ paddingLeft: indent(depth) }}
            className=":uno: flex min-w-0 flex-1 justify-between gap-4 py-3 pr-4 text-text no-underline hover:bg-accent-soft"
          >
            <strong>{page.title}</strong>
            <span className=":uno: truncate font-mono text-sm text-muted">
              {fileName(page.path)}
            </span>
          </Link>
          {(onRename || onDelete) && (
            <div className=":uno: flex shrink-0 gap-2 pr-3 pl-1">
              {onRename && (
                <Button
                  size="small"
                  aria-label={`Rename ${page.path}`}
                  onClick={() => onRename(page)}
                >
                  Rename
                </Button>
              )}
              {onDelete && (
                <Button
                  size="small"
                  aria-label={`Delete ${page.path}`}
                  onClick={() => onDelete(page)}
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </li>
      ))}
      {folder.folders.map((child) => {
        const open = !closed.has(child.path);
        const id = folderId(idPrefix, child.path);
        const count = countPages(child);
        return (
          <li
            key={child.path}
            className=":uno: [border-top:1px_solid_var(--border)]"
          >
            <button
              type="button"
              aria-expanded={open}
              aria-controls={id}
              onClick={() => toggle(child.path)}
              style={{ paddingLeft: indent(depth) }}
              className=":uno: flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent py-3 pr-4 text-left text-text [font:inherit] hover:bg-subtle"
            >
              <ChevronRight
                size={16}
                aria-hidden="true"
                className={
                  open
                    ? ":uno: shrink-0 rotate-90 text-muted transition-transform duration-200 ease-[ease-in-out] motion-reduce:transition-none"
                    : ":uno: shrink-0 text-muted transition-transform duration-200 ease-[ease-in-out] motion-reduce:transition-none"
                }
              />
              <strong className=":uno: truncate">{child.name}</strong>
              <span className=":uno: sr-only">
                , {count} {count === 1 ? "page" : "pages"}
              </span>
              <span
                aria-hidden="true"
                className=":uno: ml-auto shrink-0 text-sm text-muted"
              >
                {count}
              </span>
            </button>
            {open && <div id={id}>{renderFolder(child, depth + 1)}</div>}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className=":uno: overflow-hidden rounded-lg border border-solid border-line bg-surface shadow">
      {renderFolder(tree, 0)}
    </div>
  );
}
