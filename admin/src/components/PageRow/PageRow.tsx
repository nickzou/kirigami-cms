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
  /** When given, the row has a Delete button. */
  onDelete?: (page: PageSummary) => void;
}

/**
 * One page in the list: its title, linking to the editor, with
 * an optional Delete. It draws its own top border, so a list of rows
 * never doubles one up.
 */
export function PageRow({ page, depth, onDelete }: PageRowProps) {
  return (
    <li className=":uno: flex items-center transition-colors duration-200 ease-[ease-in-out] [border-top:1px_solid_var(--border)] hover:bg-accent-soft motion-reduce:transition-none">
      <Link
        to={pageHref(page.path)}
        style={{ paddingLeft: rowIndent(depth) }}
        className=":uno: flex min-w-0 flex-1 gap-4 py-3 pr-4 text-text no-underline"
      >
        <strong>{page.title}</strong>
      </Link>
      {onDelete && (
        <div className=":uno: shrink-0 pr-3 pl-1">
          <Button
            size="small"
            aria-label={`Delete ${page.path}`}
            onClick={() => onDelete(page)}
          >
            Delete
          </Button>
        </div>
      )}
    </li>
  );
}
