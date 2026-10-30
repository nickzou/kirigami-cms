import { PagePathDialog } from "../PagePathDialog/PagePathDialog.js";

export interface RenameDialogProps {
  /** The page's current path. */
  path: string;
  /** The paths of the other pages (not this one). */
  others?: readonly string[];
  /** Moves the page to this path. */
  onRename: (to: string) => Promise<void>;
  onClose: () => void;
}

/** Asks for a page's new path. Links to it in other pages are not rewritten. */
export function RenameDialog({
  path,
  others,
  onRename,
  onClose,
}: RenameDialogProps) {
  return (
    <PagePathDialog
      title={`Rename ${path}`}
      submitLabel="Rename"
      initial={path}
      others={others}
      note="Links to this page in other pages are not updated."
      onSubmit={onRename}
      onClose={onClose}
    />
  );
}
