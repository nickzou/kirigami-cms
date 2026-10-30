import { PagePathDialog } from "../PagePathDialog/PagePathDialog.js";

export interface NewPageDialogProps {
  /** The paths of the pages there already are. */
  others?: readonly string[];
  /** Creates the page at this path. */
  onCreate: (path: string) => Promise<void>;
  onClose: () => void;
}

/** Asks where a new page should go. */
export function NewPageDialog({
  others,
  onCreate,
  onClose,
}: NewPageDialogProps) {
  return (
    <PagePathDialog
      title="New page"
      submitLabel="Create"
      initial=""
      others={others}
      onSubmit={onCreate}
      onClose={onClose}
    />
  );
}
