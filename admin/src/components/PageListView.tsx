import { Link } from "react-router";
import type { PageSummary } from "../api.js";

/** The address of a page's editor, with each path segment encoded. */
export const pageHref = (path: string): string =>
  `/pages/${path.split("/").map(encodeURIComponent).join("/")}`;

export function PageListView({ pages }: { pages: readonly PageSummary[] }) {
  if (pages.length === 0) return <p>This site has no pages yet.</p>;

  return (
    <ul className="page-list">
      {pages.map((page) => (
        <li key={page.path}>
          <Link to={pageHref(page.path)}>
            <strong>{page.title}</strong>
            <span className="path">{page.path}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
