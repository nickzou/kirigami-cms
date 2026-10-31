import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { countPages, type FolderNode, rowIndent } from "../../page-tree.js";

export interface FolderRowProps {
  folder: FolderNode;
  /** How many folders deep the row is, for how far it is pushed in. */
  depth: number;
  open: boolean;
  onToggle: () => void;
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
  contentsId,
  children,
}: FolderRowProps) {
  const count = countPages(folder);
  return (
    <li className=":uno: [border-top:1px_solid_var(--border)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentsId}
        onClick={onToggle}
        style={{ paddingLeft: rowIndent(depth) }}
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
      {open && <div id={contentsId}>{children}</div>}
    </li>
  );
}
