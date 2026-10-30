import { useState } from "react";
import { ApiRequestError } from "../../api.js";
import { Alert } from "../Alert/Alert.js";
import { Button } from "../Button/Button.js";
import { Dialog } from "../Dialog/Dialog.js";

export interface DeleteDialogProps {
  /** The path of the page that would be deleted. */
  path: string;
  /** Deletes the page. A refusal from the API is shown in the dialog. */
  onDelete: () => Promise<void>;
  onClose: () => void;
}

/** Asks before deleting a page, and says plainly that it cannot be undone. */
export function DeleteDialog({ path, onDelete, onClose }: DeleteDialogProps) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();

  async function confirm() {
    setBusy(true);
    setFailure(undefined);
    try {
      await onDelete();
    } catch (error) {
      setFailure(
        error instanceof ApiRequestError
          ? error.message
          : "Could not reach the server. Try again.",
      );
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Delete ${path}?`} onClose={onClose}>
      <p className=":uno: mt-0">
        This deletes the page. It cannot be undone from the admin, because there
        is no history yet.
      </p>
      {failure && <Alert tone="error">{failure}</Alert>}
      <div className=":uno: mt-6 flex justify-end gap-3">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={confirm} disabled={busy}>
          {busy ? "Deleting…" : "Delete page"}
        </Button>
      </div>
    </Dialog>
  );
}
