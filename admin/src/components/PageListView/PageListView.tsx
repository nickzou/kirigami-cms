import { useId, useMemo, useState } from "react";
import type { PageSummary } from "../../api.js";
import { type FolderNode, groupPages } from "../../page-tree.js";
import { FolderRow } from "../FolderRow/FolderRow.js";
import { PageRow } from "../PageRow/PageRow.js";

export { pageHref } from "../PageRow/PageRow.js";

export interface PageListViewProps {
  pages: readonly PageSummary[];
  /** When given, each row has a Rename button. */
  onRename?: (page: PageSummary) => void;
  /** When given, each row has a Delete button. */
  onDelete?: (page: PageSummary) => void;
}

/** A safe `id` for a folder, whatever characters its name has (a space would split `aria-controls`). */
const folderId = (prefix: string, path: string): string =>
  `${prefix}-${[...path].map((c) => c.codePointAt(0)?.toString(16)).join("-")}`;

/**
 * The site's pages, grouped under their folders (see `PageRow` and
 * `FolderRow`). Each folder opens and closes on its own; they start open, so
 * nothing is hidden until you close it. A folder exists because a page is in
 * it. At each level the pages come first and the folders after them.
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
        <PageRow
          key={page.path}
          page={page}
          depth={depth}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
      {folder.folders.map((child) => (
        <FolderRow
          key={child.path}
          folder={child}
          depth={depth}
          open={!closed.has(child.path)}
          onToggle={() => toggle(child.path)}
          contentsId={folderId(idPrefix, child.path)}
        >
          {renderFolder(child, depth + 1)}
        </FolderRow>
      ))}
    </ul>
  );

  return (
    <div className=":uno: overflow-hidden rounded-lg border border-solid border-line bg-surface shadow">
      {renderFolder(tree, 0)}
    </div>
  );
}
