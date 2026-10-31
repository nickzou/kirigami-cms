import { type FormEvent, useId, useState } from "react";
import { ApiRequestError } from "../../api.js";
import { pathProblem } from "../../page-path.js";
import { Alert } from "../Alert/Alert.js";
import { Button } from "../Button/Button.js";
import { Dialog } from "../Dialog/Dialog.js";
import { TextField } from "../TextField/TextField.js";

export interface RenameDialogProps {
  /** The page's current path. */
  path: string;
  /** The paths of the other pages (not this one), to say right away if one is taken. */
  others?: readonly string[];
  /** Moves the page to this path. A refusal from the API is shown in the dialog. */
  onRename: (to: string) => Promise<void>;
  onClose: () => void;
}

const EXTENSION = ".md";
/** The path without its extension, which is not the person's to change. */
const stemOf = (path: string): string =>
  path.endsWith(EXTENSION) ? path.slice(0, -EXTENSION.length) : path;

/**
 * Asks for a page's new path. A slash in it moves the page to another folder.
 * Pages are markdown, so `.md` is shown after the name and is not typed. What is
 * wrong with the path is said as it is typed.
 */
export function RenameDialog({
  path,
  others,
  onRename,
  onClose,
}: RenameDialogProps) {
  const helpId = useId();
  const [name, setName] = useState(stemOf(path));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();

  const stem = name.trim().replace(/^\/+/, "");
  const next = stem === "" ? "" : `${stem}${EXTENSION}`;
  const unchanged = next === path;
  const problem =
    next === "" || unchanged ? undefined : pathProblem(next, others ?? []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (next === "" || unchanged || problem || busy) return;
    setBusy(true);
    setFailure(undefined);
    try {
      await onRename(next);
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
    <Dialog title={`Rename ${path}`} onClose={onClose}>
      <form onSubmit={submit} className=":uno: flex flex-col gap-4">
        <div>
          <TextField
            label="New path"
            autoFocus
            mono
            suffix={EXTENSION}
            value={name}
            onChange={(event) => {
              // Typing the extension is no use: it is kept.
              setName(event.target.value.replace(/\.md$/i, ""));
              setFailure(undefined);
            }}
            onFocus={(event) => event.currentTarget.select()}
            aria-describedby={helpId}
            aria-invalid={problem !== undefined}
            spellCheck={false}
          />
          <p id={helpId} className=":uno: mt-2 mb-0 text-sm text-muted">
            Use a slash to move it to another folder. Links to this page in
            other pages are not updated.
          </p>
          {problem && (
            <p role="alert" className=":uno: mt-2 mb-0 text-sm text-danger">
              {problem}
            </p>
          )}
        </div>
        {failure && <Alert tone="error">{failure}</Alert>}
        <div className=":uno: mt-6 flex justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="primary"
            disabled={busy || next === "" || unchanged || problem !== undefined}
          >
            {busy ? "Working…" : "Rename"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
