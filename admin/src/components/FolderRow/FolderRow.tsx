import { ChevronRight, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { countPages, type FolderNode, rowIndent } from "../../page-tree.js";

export interface FolderRowProps {
  folder: FolderNode;
  /** How many folders deep the row is, for how far it is pushed in. */
  depth: number;
  open: boolean;
  onToggle: () => void;
  /** When given, the row has a button that starts a new page in this folder. */
  onNewPage?: (folder: FolderNode) => void;
  /** An `id` for the contents, which the toggle controls. */
  contentsId: string;
  /** The folder's rows, shown while it is open. */
  children?: ReactNode;
}

/**
 * A folder in the list: a row that opens and closes its contents. It draws its
 * own top border, like `PageRow`.
 */
export function FolderRow({
  folder,
  depth,
  open,
  onToggle,
  onNewPage,
  contentsId,
  children,
}: FolderRowProps) {
  const count = countPages(folder);
  return (
    <li className=":uno: [border-top:1px_solid_var(--border)]">
      <div className=":uno: flex items-center transition-colors duration-200 ease-[ease-in-out] hover:bg-subtle motion-reduce:transition-none">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentsId}
          onClick={onToggle}
          style={{ paddingLeft: rowIndent(depth) }}
          className=":uno: flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent py-3 pr-4 text-left text-text [font:inherit] motion-reduce:transition-none"
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
          <strong className=":uno: truncate">{folder.name}</strong>
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
        {onNewPage && (
          <button
            type="button"
            aria-label={`New page in ${folder.path}`}
            title={`New page in ${folder.path}`}
            onClick={() => onNewPage(folder)}
            className=":uno: mr-3 ml-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded border-0 bg-transparent text-muted transition-colors duration-200 ease-[ease-in-out] hover:bg-line hover:text-text motion-reduce:transition-none"
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      {open && <div id={contentsId}>{children}</div>}
    </li>
  );
}
