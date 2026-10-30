import { Link } from "react-router";
import type { PageSummary } from "../../api.js";
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

export function PageListView({ pages, onRename, onDelete }: PageListViewProps) {
  if (pages.length === 0)
    return <p className=":uno: text-muted">This site has no pages yet.</p>;

  return (
    <ul className=":uno: m-0 list-none overflow-hidden rounded-lg border border-solid border-line bg-surface p-0 shadow">
      {pages.map((page) => (
        <li
          key={page.path}
          className=":uno: flex items-center [&:not(:first-child)]:[border-top:1px_solid_var(--border)]"
        >
          <Link
            to={pageHref(page.path)}
            className=":uno: flex min-w-0 flex-1 justify-between gap-4 px-4 py-3 text-text no-underline hover:bg-accent-soft"
          >
            <strong>{page.title}</strong>
            <span className=":uno: truncate font-mono text-sm text-muted">
              {page.path}
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
    </ul>
  );
}
