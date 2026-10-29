import { Link } from "react-router";
import type { PageSummary } from "../api.js";

/** The address of a page's editor, with each path segment encoded. */
export const pageHref = (path: string): string =>
  `/pages/${path.split("/").map(encodeURIComponent).join("/")}`;

export function PageListView({ pages }: { pages: readonly PageSummary[] }) {
  if (pages.length === 0)
    return <p className=":uno: text-muted">This site has no pages yet.</p>;

  return (
    <ul className=":uno: m-0 list-none overflow-hidden rounded-lg border border-solid border-line bg-surface p-0 shadow">
      {pages.map((page) => (
        <li
          key={page.path}
          className=":uno: [&:not(:first-child)]:border-t [&:not(:first-child)]:border-solid [&:not(:first-child)]:border-line"
        >
          <Link
            to={pageHref(page.path)}
            className=":uno: flex justify-between gap-4 px-4 py-3 text-text no-underline hover:bg-accent-soft"
          >
            <strong>{page.title}</strong>
            <span className=":uno: font-mono text-sm text-muted">
              {page.path}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
