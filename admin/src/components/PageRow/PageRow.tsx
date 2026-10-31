import { Link } from "react-router";
import type { PageSummary } from "../../api.js";
import { rowIndent } from "../../page-tree.js";
import { Button } from "../Button/Button.js";

/** The address of a page's editor, with each path segment encoded. */
export const pageHref = (path: string): string =>
  `/pages/${path.split("/").map(encodeURIComponent).join("/")}`;

export interface PageRowProps {
  page: PageSummary;
  /** How many folders deep the row is, for how far it is pushed in. */
  depth: number;
  /** When given, the row has a Rename button. */
  onRename?: (page: PageSummary) => void;
  /** When given, the row has a Delete button. */
  onDelete?: (page: PageSummary) => void;
}

/**
 * One page in the list: its title, linking to the editor, with
 * optional Rename and Delete. It draws its own top border, so a list of rows
 * never doubles one up.
 */
export function PageRow({ page, depth, onRename, onDelete }: PageRowProps) {
  return (
    <li className=":uno: flex items-center [border-top:1px_solid_var(--border)]">
      <Link
        to={pageHref(page.path)}
        style={{ paddingLeft: rowIndent(depth) }}
        className=":uno: flex min-w-0 flex-1 gap-4 py-3 pr-4 text-text no-underline transition-colors duration-200 ease-[ease-in-out] hover:bg-accent-soft motion-reduce:transition-none"
      >
        <strong>{page.title}</strong>
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
  );
}
